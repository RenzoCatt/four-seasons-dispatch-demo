import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subtotal: true,
        tax: true,
        total: true,
        createdAt: true,
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
        customerName: inv.customer.name,
      }))
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
