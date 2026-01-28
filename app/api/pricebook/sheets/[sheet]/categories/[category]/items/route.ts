import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET items for a sheet + category
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

    const items = await prisma.priceBookItem.findMany({
      where: {
        sheet: sheet,
        category: category,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
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
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}
