import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function num(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workOrderId } = await params;
    const body = await req.json().catch(() => ({}));

    // Basic validation
    const type = String(body?.type ?? body?.kind ?? "SERVICE").toUpperCase();
    const description = String(body?.description ?? "").trim();
    const details = String(body?.details ?? "").trim();

    if (!description) {
      return new NextResponse("Missing description", { status: 400 });
    }

    const qty = num(body?.qty, 1);
    const unitPrice = num(body?.unitPrice, 0); // dollars (matches Prisma schema Float)
    const taxable = body?.taxable === undefined ? true : Boolean(body.taxable);

    // Ensure work order exists
    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true },
    });
    if (!wo) return new NextResponse("Work order not found", { status: 404 });

    const created = await prisma.workOrderLineItem.create({
      data: {
        workOrderId,
        type,
        description,
        details: details || null,
        qty,
        unitPrice,
        taxable,
      } as any,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/work-orders/[id]/items", error);
    return new NextResponse("Failed to create line item", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workOrderId } = await params;
    const body = await req.json().catch(() => ({}));

    // Verify work order exists
    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true },
    });
    if (!wo) return new NextResponse("Work order not found", { status: 404 });

    // Expect { items: [ { id, description, details?, qty, unitPrice, taxable }, ... ] }
    const items = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    // Batch update all items in a transaction
    let updated = 0;
    await prisma.$transaction(
      items.map((item: any) => {
        const updateData: any = {};
        if (item.description !== undefined) updateData.description = String(item.description);
        if (item.details !== undefined) updateData.details = item.details ? String(item.details) : null;
        if (item.qty !== undefined) updateData.qty = Number(item.qty);
        if (item.unitPrice !== undefined) updateData.unitPrice = Number(item.unitPrice);
        if (item.taxable !== undefined) updateData.taxable = Boolean(item.taxable);

        return prisma.workOrderLineItem.update({
          where: { id: String(item.id) },
          data: updateData,
        });
      })
    );

    updated = items.length;
    return NextResponse.json({ updated });
  } catch (error) {
    console.error("PATCH /api/work-orders/[id]/items", error);
    return new NextResponse("Failed to update line items", { status: 500 });
  }
}
