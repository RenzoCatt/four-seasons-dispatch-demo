import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const q = (searchParams.get("q") || "").trim();

  if (!categoryId && !q) {
    return NextResponse.json({ error: "categoryId or q required" }, { status: 400 });
  }

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

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const categoryId = String(body?.categoryId || "");
  const name = String(body?.name || "").trim();

  if (!categoryId || !name) {
    return NextResponse.json({ error: "categoryId + name required" }, { status: 400 });
  }

  const created = await prisma.pricebookItemNew.create({
    data: {
      categoryId,
      code: body?.code ? String(body.code).trim() : null,
      name,
      description: body?.description ? String(body.description) : null,
      unit: body?.unit ? String(body.unit) : null,
    },
  });

  return NextResponse.json(created);
}
