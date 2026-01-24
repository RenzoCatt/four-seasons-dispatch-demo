import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.workOrder.update({
    where: { id },
    data: {
      status: body.status,
      description: body.description,
      completedAt: body.completedAt,
    },
    include: {
      customer: true,
      location: true,
    },
  }).catch(() => null);

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
