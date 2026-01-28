import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        total: inv.total,
        createdAt: inv.createdAt.toISOString(),
        customerName: inv.customer.name,
      }))
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
