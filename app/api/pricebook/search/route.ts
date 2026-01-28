import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PriceTier } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const industry = searchParams.get("sheet") || ""; // "sheet" param maps to industry
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Build where clause for filtering
    const where: any = {};

    if (industry) {
      where.category = {
        industry: {
          name: { equals: industry, mode: "insensitive" },
        },
      };
    }

    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    // Fetch items with all rates
    const items = await prisma.pricebookItemNew.findMany({
      where,
      include: {
        rates: true,
        category: {
          include: {
            industry: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
      take: limit,
    });

    // Map to flat array with all rates
    const resultItems = items.map((item) => {
      // Build rates object with all available tiers
      const rates: Partial<Record<PriceTier, number>> = {};
      for (const rate of item.rates) {
        rates[rate.tier] = parseFloat(rate.unitPrice.toString());
      }

      // Default to STANDARD price for display
      const displayPrice = rates.STANDARD ?? rates.MEMBER ?? rates.RUMI ?? 0;

      return {
        id: item.id,
        category: item.category.name,
        code: item.code,
        name: item.name,
        description: item.description,
        sheet: item.category.industry.name,
        taxableDefault: true, // Default for now
        hours: item.rates[0]?.hours?.toString() || null,
        equipment: item.rates[0]?.equipment?.toString() || null,
        hourlyRate: item.rates[0]?.hourlyRate?.toString() || null,
        materialMarkUp: item.rates[0]?.materialMarkup?.toString() || null,
        unitPrice: displayPrice,
        rates, // All available rates
      };
    });

    return NextResponse.json({
      success: true,
      items: resultItems,
    });
  } catch (error) {
    console.error("Price book search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
