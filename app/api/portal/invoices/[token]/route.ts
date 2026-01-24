import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { publicToken: token },
      include: {
        customer: true,
        location: true,
        lineItems: true,
      },
    });

    if (!invoice)
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );

    return NextResponse.json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      createdAt: invoice.createdAt.toISOString(),
      customerName: invoice.customer.name,
      phone: invoice.customer.phone || "",
      email: invoice.customer.email || "",
      locationAddress: invoice.location.address,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      lineItems: invoice.lineItems.map((li) => ({
        id: li.id,
        type: li.type,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: li.total,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
