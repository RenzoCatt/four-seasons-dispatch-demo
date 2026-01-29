import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: workOrderId, itemId } = await params;

    if (!workOrderId || !itemId) {
      return NextResponse.json({ error: "Invalid work order ID or item ID" }, { status: 400 });
    }

    const body = await request.json();
    const { description, qty, unitPrice, taxable } = body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (description !== undefined) updateData.description = String(description);
    if (qty !== undefined) updateData.qty = Number(qty);
    if (unitPrice !== undefined) updateData.unitPrice = Number(unitPrice);
    if (taxable !== undefined) updateData.taxable = Boolean(taxable);

    // Verify the line item belongs to the specified work order
    const lineItem = await prisma.workOrderLineItem.findUnique({
      where: { id: itemId },
    });

    if (!lineItem || lineItem.workOrderId !== workOrderId) {
      return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    // Update the line item
    const updated = await prisma.workOrderLineItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/work-orders/[id]/items/[itemId]", error);
    return NextResponse.json({ error: "Failed to update line item" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: workOrderId, itemId } = await params;

    if (!workOrderId || !itemId) {
      return NextResponse.json({ error: "Invalid work order ID or item ID" }, { status: 400 });
    }

    // Verify the line item belongs to the specified work order
    const lineItem = await prisma.workOrderLineItem.findUnique({
      where: { id: itemId },
    });

    if (!lineItem || lineItem.workOrderId !== workOrderId) {
      return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    // Delete the line item
    await prisma.workOrderLineItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/work-orders/[id]/items/[itemId]", error);
    return NextResponse.json({ error: "Failed to delete line item" }, { status: 500 });
  }
}
