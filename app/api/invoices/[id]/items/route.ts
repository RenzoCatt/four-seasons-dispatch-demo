import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function recalc(lineItems: { total: number }[]) {
  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const tax = Math.round(subtotal * 0.05); // 5% tax — adjust as needed
  return { subtotal, tax, total: subtotal + tax };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const quantity = Number(body.quantity ?? 1);
  const unitPrice = Number(body.unitPriceCents ?? 0);
  const total = quantity * unitPrice;

  const item = await prisma.invoiceLineItem.create({
    data: {
      invoiceId: id,
      type: body.type,
      description: body.description,
      details: body.details ?? null,
      quantity,
      unitPrice,
      total,
    },
  });

  const all = await prisma.invoiceLineItem.findMany({
    where: { invoiceId: id },
    select: { total: true },
  });

  const totals = recalc(all);

  await prisma.invoice.update({
    where: { id },
    data: totals,
  });

  return NextResponse.json(item, { status: 201 });
}
