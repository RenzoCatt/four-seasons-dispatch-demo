import { prisma } from "@/lib/prisma";
import { Prisma, PricingTier, PriceTier } from "@prisma/client";

type Decimal = Prisma.Decimal;

interface ImportOptions {
  uploadId: string;
  csvText: string;
}

interface ImportResult {
  itemsCreated: number;
  itemsUpdated: number;
  ratesCreated: number;
  ratesUpdated: number;
  errors: string[];
}

interface ParsedRow {
  sheet: string;
  category: string;
  code: string;
  name: string;
  tier: PriceTier;
  unitPrice: Decimal;
  hours?: Decimal;
  equipment?: Decimal;
  hourlyRate?: Decimal;
  materialMarkUp?: Decimal;
  description?: string;
  // Original CSV line number (1-based)
  line: number;
}

/**
 * Parse and normalize a decimal value from CSV, rounding to 2 decimal places.
 */
function parseDecimal(value: string | undefined | null): Decimal | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value.trim());
  if (isNaN(num)) return null;
  return new Prisma.Decimal(num.toFixed(2));
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV text into structured rows with validation.
 */
function parseCSV(csvText: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return { rows: [], errors: ["CSV file is empty"] };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  // Validate required headers
  const requiredHeaders = ["sheet", "category", "code", "name", "tier", "unit_price"];
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      errors.push(`Missing required column: ${required}`);
    }
  }

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);

    try {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      // Validate tier
      const tier = row["tier"]?.toUpperCase() as PriceTier;
      if (!["MEMBER", "STANDARD", "RUMI"].includes(tier)) {
        errors.push(`Line ${i + 1}: Invalid tier "${row["tier"]}"`);
        continue;
      }

      // Parse unit price (required)
      const unitPrice = parseDecimal(row["unit_price"]);
      if (!unitPrice) {
        errors.push(`Line ${i + 1}: Invalid or missing unit_price "${row["unit_price"]}"`);
        continue;
      }

      const parsedRow: ParsedRow = {
        sheet: row["sheet"] || "",
        category: row["category"] || "",
        code: row["code"] || "",
        name: row["name"] || "",
        tier,
        unitPrice,
        hours: parseDecimal(row["hours"]) || undefined,
        equipment: parseDecimal(row["equipment"]) || undefined,
        hourlyRate: parseDecimal(row["hourly_rate"]) || undefined,
        materialMarkUp: parseDecimal(row["material_mark_up"]) || undefined,
        description: row["description"] || undefined,
        line: i + 1,
      };

      // Validate required fields
      if (!parsedRow.sheet || !parsedRow.category || !parsedRow.code || !parsedRow.name) {
        errors.push(`Line ${i + 1}: Missing required field(s)`);
        continue;
      }

      rows.push(parsedRow);
    } catch (error) {
      errors.push(`Line ${i + 1}: Parse error - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { rows, errors };
}

/**
 * Import price book data from CSV text.
 * Groups rows by code and creates/updates items with their associated rates.
 */
export async function importPricebook(options: ImportOptions): Promise<ImportResult> {
  const { uploadId, csvText } = options;

  const result: ImportResult = {
    itemsCreated: 0,
    itemsUpdated: 0,
    ratesCreated: 0,
    ratesUpdated: 0,
    errors: [],
  };

  // Parse CSV
  const { rows, errors } = parseCSV(csvText);
  result.errors.push(...errors);

  if (rows.length === 0) {
    return result;
  }

  // Group rows by full item identity (code + name + category + sheet)
  const itemsByIdentity = new Map<string, ParsedRow[]>();
  const identityKey = (r: ParsedRow) => `${r.code}|${r.name}|${r.category}|${r.sheet}`;
  for (const row of rows) {
    const key = identityKey(row);
    if (!itemsByIdentity.has(key)) {
      itemsByIdentity.set(key, []);
    }
    itemsByIdentity.get(key)!.push(row);
  }

  // Process each item individually (not in one big transaction to avoid timeouts)
  try {
    for (const [key, itemRows] of itemsByIdentity.entries()) {
      try {
        await prisma.$transaction(async (tx) => {
        // Use first row for item-level data (rows for same identity share item data)
        const firstRow = itemRows[0];

        // Detect conflicting item-level data across rows for the same code
        const signature = (r: ParsedRow) => `${r.sheet}|${r.category}|${r.name}|${r.description ?? ''}`;
        const firstSig = signature(firstRow);
        const conflictingLines: number[] = [];
        for (const r of itemRows.slice(1)) {
          if (signature(r) !== firstSig) conflictingLines.push(r.line);
        }
        if (conflictingLines.length > 0) {
          result.errors.push(
            `Item identity ${key}: conflicting item data across lines ${[firstRow.line, ...conflictingLines].join(', ')}. ` +
            `Using line ${firstRow.line} values: sheet='${firstRow.sheet}', category='${firstRow.category}', name='${firstRow.name}'.`
          );
        }

        // Upsert industry from sheet name
        const industry = await tx.pricebookIndustry.upsert({
          where: { name: firstRow.sheet },
          update: {},
          create: { 
            name: firstRow.sheet, 
            sortOrder: 0 
          },
        });

        // Upsert category under industry
        const category = await tx.pricebookCategory.upsert({
          where: {
            industryId_name: {
              industryId: industry.id,
              name: firstRow.category,
            },
          },
          update: {},
          create: {
            industryId: industry.id,
            name: firstRow.category,
            sortOrder: 0,
          },
        });

        // Upsert item under category
        const existingItem = await tx.pricebookItemNew.findUnique({
          where: {
            categoryId_code: {
              categoryId: category.id,
              code: firstRow.code,
            },
          },
        });

        const item = await tx.pricebookItemNew.upsert({
          where: {
            categoryId_code: {
              categoryId: category.id,
              code: firstRow.code,
            },
          },
          update: {
            name: firstRow.name,
            description: firstRow.description || null,
          },
          create: {
            categoryId: category.id,
            code: firstRow.code,
            name: firstRow.name,
            description: firstRow.description || null,
            sortOrder: 0,
          },
        });

        if (existingItem) {
          result.itemsUpdated++;
        } else {
          result.itemsCreated++;
        }

        // Upsert rates for each tier in this item
        for (const row of itemRows) {
          const existingRate = await tx.pricebookRateNew.findUnique({
            where: {
              itemId_tier: {
                itemId: item.id,
                tier: row.tier,
              },
            },
          });

          await tx.pricebookRateNew.upsert({
            where: {
              itemId_tier: {
                itemId: item.id,
                tier: row.tier,
              },
            },
            create: {
              itemId: item.id,
              tier: row.tier,
              unitPrice: row.unitPrice,
              hours: row.hours || null,
              equipment: row.equipment || null,
              hourlyRate: row.hourlyRate || null,
              materialMarkup: row.materialMarkUp || null,
            },
            update: {
              unitPrice: row.unitPrice,
              hours: row.hours || null,
              equipment: row.equipment || null,
              hourlyRate: row.hourlyRate || null,
              materialMarkup: row.materialMarkUp || null,
            },
          });

          if (existingRate) {
            result.ratesUpdated++;
          } else {
            result.ratesCreated++;
          }
        }
        }, {
          timeout: 10000, // 10 seconds per item
        });
      } catch (itemError) {
        result.errors.push(
          `Item ${key}: ${itemError instanceof Error ? itemError.message : String(itemError)}`
        );
      }
    }
  } catch (error) {
    result.errors.push(`Import error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}
