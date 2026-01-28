import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PricingTier } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const sheet = searchParams.get("sheet") || "";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Get active upload
    const activeUpload = await prisma.priceBookUpload.findFirst({
      where: { isActive: true },
    });

    if (!activeUpload) {
      return NextResponse.json({
        success: false,
        message: "No active price book found",
        data: [],
      });
    }

    // Build where clause for filtering
    const where: any = {
      uploadId: activeUpload.id,
    };

    if (sheet) {
      where.sheet = sheet;
    }

    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    // Fetch items with all rates
    const items = await prisma.priceBookItem.findMany({
      where,
      include: {
        rates: true,
      },
      orderBy: [{ category: "asc" }, { code: "asc" }],
      take: limit,
    });

    // Map to flat array with all rates
    const resultItems = items.map((item) => {
      // Build rates object with all available tiers
      const rates: Partial<Record<PricingTier, number>> = {};
      for (const rate of item.rates) {
        rates[rate.tier] = parseFloat(rate.unitPrice.toString());
      }

      // Default to STANDARD price for display
      const displayPrice = rates.STANDARD ?? rates.MEMBER ?? rates.RUMI ?? 0;

      return {
        id: item.id,
        category: item.category,
        code: item.code,
        name: item.name,
        description: item.description,
        sheet: item.sheet,
        taxableDefault: item.taxableDefault,
        hours: item.hours?.toString() || null,
        equipment: item.equipment?.toString() || null,
        hourlyRate: item.hourlyRate?.toString() || null,
        materialMarkUp: item.materialMarkUp?.toString() || null,
        unitPrice: displayPrice,
        rates, // All available rates
      };
    });

    return NextResponse.json({
      success: true,
      activeUpload: {
        id: activeUpload.id,
        filename: activeUpload.filename,
        effectiveDate: activeUpload.effectiveDate,
      },
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
