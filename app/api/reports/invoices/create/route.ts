import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const workOrderId = body?.workOrderId;

  if (!workOrderId) {
    return NextResponse.json({ error: "Missing workOrderId" }, { status: 400 });
  }

  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { invoice: true },
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

  const invoice = await prisma.invoice.create({
    data: {
      customerId: wo.customerId,
      locationId: wo.locationId,
      workOrderId: wo.id,
      status: "DRAFT",
      subtotal: 0,
      tax: 0,
      total: 0,
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
