import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { store } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      location: true,
      lineItems: true,
    },
  });

  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ✅ Pull assignment from latest DispatchEvent (source of truth)
  const latest = await prisma.dispatchEvent.findFirst({
    where: { workOrderId: id },
    orderBy: { startAt: "desc" },
  });

  // Find tech by ID from store
  const tech = latest?.techId ? store.techs.find((t) => t.id === latest.techId) : null;

  const assignedTechId = latest?.techId ?? null;
  const assignedStartAt = latest?.startAt ?? null;
  const assignedEndAt = latest?.endAt ?? null;
  const assignedTech = tech ? { id: tech.id, name: tech.name } : null;

  return NextResponse.json({
    ...workOrder,
    assignedTechId,
    assignedStartAt,
    assignedEndAt,
    assignedTech,
  });
}

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
