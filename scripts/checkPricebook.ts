import 'dotenv/config';
import { prisma } from "../lib/prisma.js";

async function main() {
  // Count total items
  const totalItems = await prisma.priceBookItem.count();
  console.log("Total items in database:", totalItems);

  // Count total rates
  const totalRates = await prisma.priceBookRate.count();
  console.log("Total rates in database:", totalRates);

  // Check for ACR0240 specifically
  const ductItems = await prisma.priceBookItem.findMany({
    where: { code: "ACR0240" },
    include: { rates: true },
  });

  console.log("\nFound", ductItems.length, 'items with code "ACR0240":');
  ductItems.forEach((item) => {
    console.log("-", item.code, ":", item.name);
    console.log("  Category:", item.category);
    console.log(
      "  Rates:",
      item.rates.map((r) => `${r.tier}=$${r.unitPrice}`).join(", ")
    );
  });

  // Search for "duct" in any field
  const ductSearch = await prisma.priceBookItem.findMany({
    where: {
      OR: [
        { name: { contains: "duct", mode: "insensitive" } },
        { description: { contains: "duct", mode: "insensitive" } },
        { code: { contains: "duct", mode: "insensitive" } },
      ],
    },
    include: { rates: true },
  });

  console.log("\nFound", ductSearch.length, 'items containing "duct":');
  ductSearch.slice(0, 5).forEach((item) => {
    console.log("-", item.code, ":", item.name);
  });

  // Check active upload
  const activeUpload = await prisma.priceBookUpload.findFirst({
    where: { isActive: true },
  });

  if (activeUpload) {
    console.log("\nActive upload:");
    console.log("  Filename:", activeUpload.filename);
    console.log("  Uploaded:", activeUpload.createdAt);
    console.log("  Effective:", activeUpload.effectiveDate);
  } else {
    console.log("\nNo active upload found!");
  }

  // Get sample of first 10 items
  const sampleItems = await prisma.priceBookItem.findMany({
    take: 10,
    include: { rates: true },
  });

  console.log("\nFirst 10 items in database:");
  sampleItems.forEach((item) => {
    console.log(
      "-",
      item.code,
      ":",
      item.name,
      "(",
      item.rates.length,
      "rates)"
    );
  });
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
