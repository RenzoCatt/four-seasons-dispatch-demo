import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!invoice)
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );

    if (!invoice.customer.email)
      return NextResponse.json(
        { error: "Customer email not available" },
        { status: 400 }
      );

    if (!invoice.publicToken)
      return NextResponse.json(
        { error: "Invoice not sent yet (no portal token)" },
        { status: 400 }
      );

    // TODO: Send email with:
    // 1. PDF attachment from /api/invoices/[id]/pdf
    // 2. Portal link: /portal/invoices/[token]
    // 3. Customer message
    //
    // Supported providers:
    // - Resend (recommended): https://resend.com
    // - SendGrid: https://sendgrid.com
    // - Mailgun: https://mailgun.com
    //
    // For now, just acknowledge the request
    console.log(`Email would be sent to: ${invoice.customer.email}`);
    console.log(`Portal link: /portal/invoices/${invoice.publicToken}`);

    return NextResponse.json({
      ok: true,
      message: "Email functionality not yet configured",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
