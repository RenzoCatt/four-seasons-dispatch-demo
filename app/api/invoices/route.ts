import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Support optional customerId query param for filtering
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const where = customerId ? { customerId } : undefined;

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subtotal: true,
        tax: true,
        total: true,
        createdAt: true,
        workOrderId: true,
        workOrder: {
          select: {
            jobNumber: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        subtotal: inv.subtotal,
        tax: inv.tax,
        total: inv.total,
        createdAt: inv.createdAt.toISOString(),
        workOrderId: inv.workOrderId,
        jobNumber: inv.workOrder?.jobNumber,
        customerName: inv.customer.name,
      }))
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
