import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET distinct sheets from PriceBookItem
export async function GET() {
  try {
    const sheets = await prisma.priceBookItem.groupBy({
      by: ["sheet"],
      _count: {
        id: true,
      },
      orderBy: {
        sheet: "asc",
      },
    });

    const result = sheets.map((s) => ({
      sheet: s.sheet,
      count: s._count.id,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching sheets:", error);
    return NextResponse.json({ error: "Failed to fetch sheets" }, { status: 500 });
  }
}
