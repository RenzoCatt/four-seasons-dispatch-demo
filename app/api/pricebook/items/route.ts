import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const q = (searchParams.get("q") || "").trim();

  console.log("API query params:", { categoryId, q });

  try {
    const items = await prisma.pricebookItemNew.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { rates: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: q ? 100 : undefined,
    });

    console.log("Found items:", items.length);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const categoryId = String(body?.categoryId || "").trim();
  const name = String(body?.name || "").trim();
  const code = String(body?.code || "").trim();

  if (!categoryId || !name) {
    return NextResponse.json({ error: "categoryId + name required" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const created = await prisma.pricebookItemNew.create({
    data: {
      categoryId,
      code,
      name,
      description: body?.description ? String(body.description) : null,
      unit: body?.unit ? String(body.unit) : null,
    },
  });

  return NextResponse.json(created);
}
