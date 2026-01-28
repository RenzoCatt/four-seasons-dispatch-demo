import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET items for an industry (sheet) + category
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sheet: string; category: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const { sheet: sheetParam, category: categoryParam } = await params;
    const sheet = decodeURIComponent(sheetParam);
    const category = decodeURIComponent(categoryParam);
    const q = (searchParams.get("q") || "").trim();

    // Find the category by industry name and category name
    const categoryRecord = await prisma.pricebookCategory.findFirst({
      where: {
        name: category,
        industry: {
          name: sheet,
        },
      },
      include: {
        items: {
          where: q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { code: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
          include: {
            rates: {
              select: {
                tier: true,
                unitPrice: true,
              },
            },
          },
          orderBy: {
            code: "asc",
          },
        },
      },
    });

    if (!categoryRecord) {
      return NextResponse.json([]);
    }

    return NextResponse.json(categoryRecord.items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}
