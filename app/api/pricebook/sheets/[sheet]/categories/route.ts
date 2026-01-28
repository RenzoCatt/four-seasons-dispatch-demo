import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET categories for a sheet
export async function GET(req: Request, { params }: { params: Promise<{ sheet: string }> }) {
  try {
    const { sheet: sheetParam } = await params;
    const sheet = decodeURIComponent(sheetParam);

    const categories = await prisma.priceBookItem.groupBy({
      by: ["category"],
      where: {
        sheet: sheet,
      },
      _count: {
        id: true,
      },
      orderBy: {
        category: "asc",
      },
    });

    const result = categories.map((c) => ({
      category: c.category,
      count: c._count.id,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
