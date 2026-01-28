import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const industries = await prisma.pricebookIndustry.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(industries);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const created = await prisma.pricebookIndustry.create({ data: { name } });
  return NextResponse.json(created);
}
