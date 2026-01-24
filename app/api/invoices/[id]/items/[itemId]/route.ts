import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function recalc(lineItems: { total: number }[]) {
  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const tax = Math.round(subtotal * 0.05); // 5% tax — adjust as needed
  return { subtotal, tax, total: subtotal + tax };
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;

  await prisma.invoiceLineItem.delete({
    where: { id: itemId },
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

  return NextResponse.json({ ok: true });
}
