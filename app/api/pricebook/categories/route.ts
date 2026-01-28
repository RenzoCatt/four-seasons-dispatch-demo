import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industryId = searchParams.get("industryId") || "";
  const parentId = searchParams.get("parentId"); // nullable

  if (!industryId) {
    return NextResponse.json({ error: "industryId required" }, { status: 400 });
  }

  const categories = await prisma.pricebookCategory.findMany({
    where: { industryId, parentId: parentId ? parentId : null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const body = await req.json();
  const industryId = String(body?.industryId || "");
  const parentId = body?.parentId ? String(body.parentId) : null;
  const name = String(body?.name || "").trim();

  if (!industryId || !name) {
    return NextResponse.json({ error: "industryId + name required" }, { status: 400 });
  }

  const created = await prisma.pricebookCategory.create({
    data: { industryId, parentId, name },
  });

  return NextResponse.json(created);
}
