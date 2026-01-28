import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET categories for an industry (sheet)
export async function GET(req: Request, { params }: { params: Promise<{ sheet: string }> }) {
  try {
    const { sheet: sheetParam } = await params;
    const sheet = decodeURIComponent(sheetParam);

    const industry = await prisma.pricebookIndustry.findFirst({
      where: { name: sheet },
      include: {
        categories: {
          include: {
            _count: {
              select: { items: true },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!industry) {
      return NextResponse.json([]);
    }

    const result = industry.categories.map((c) => ({
      category: c.name,
      count: c._count.items,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
