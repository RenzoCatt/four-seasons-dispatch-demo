import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const TAX_RATE = 0.05;

export async function POST(req: Request) {
  const body = await req.json();
  const workOrderId = body?.workOrderId;

  if (!workOrderId) {
    return NextResponse.json({ error: "Missing workOrderId" }, { status: 400 });
  }

  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { 
      invoice: true,
      lineItems: true,
    },
  });

  if (!wo) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  if (wo.status !== "COMPLETED") {
    return NextResponse.json({ error: "Work order not completed" }, { status: 400 });
  }

  if (wo.invoice) {
    return NextResponse.json({ error: "Invoice already exists" }, { status: 400 });
  }

  // Build line items data and compute totals
  const lineItemsData =
    wo.lineItems?.map((li) => {
      const quantity = Math.round(li.qty ?? 1);
      const unitPrice = Math.round(li.unitPrice * 100); // Convert to cents
      const total = quantity * unitPrice;

      return {
        type: li.type === "SERVICE" || li.type === "MATERIAL" ? li.type as any : "LABOR",
        description: li.description,
        details: li.details ?? null,
        quantity,
        unitPrice,
        total,
      };
    }) ?? [];

  // Compute totals from line items
  const subtotal = lineItemsData.reduce((sum, it) => sum + (it.total ?? 0), 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  // Transaction: create invoice + line items
  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        customerId: wo.customerId,
        locationId: wo.locationId,
        workOrderId: wo.id,
        status: "DRAFT",
        subtotal,
        tax,
        total,
      },
    });

    if (lineItemsData.length) {
      await tx.invoiceLineItem.createMany({
        data: lineItemsData.map((it) => ({
          invoiceId: created.id,
          ...it,
        })),
      });
    }

    return created;
  });

  return NextResponse.json(invoice, { status: 201 });
}
