import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      location: true,
      lineItems: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
    customerName: inv.customer.name,
    phone: inv.customer.phone ?? "",
    email: inv.customer.email ?? "",
    locationAddress: inv.location.address,
    subtotal: inv.subtotal,
    tax: inv.tax,
    total: inv.total,
    publicToken: inv.publicToken,
    lineItems: inv.lineItems,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const status = body?.status;

  // Generate publicToken if transitioning to SENT status
  let data: any = {
    ...(status ? { status } : {}),
  };

  if (status === "SENT") {
    // Generate unique token for public portal
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    data.publicToken = token;
    data.sentAt = new Date();
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
