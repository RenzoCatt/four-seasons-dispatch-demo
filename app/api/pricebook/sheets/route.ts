import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET distinct industries (sheets) from PricebookIndustry
export async function GET() {
  try {
    const industries = await prisma.pricebookIndustry.findMany({
      include: {
        _count: {
          select: {
            categories: {
              where: {
                items: {
                  some: {},
                },
              },
            },
          },
        },
        categories: {
          include: {
            _count: {
              select: { items: true },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const result = industries.map((industry) => ({
      sheet: industry.name,
      count: industry.categories.reduce((sum, cat) => sum + cat._count.items, 0),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching sheets:", error);
    return NextResponse.json({ error: "Failed to fetch sheets" }, { status: 500 });
  }
}
