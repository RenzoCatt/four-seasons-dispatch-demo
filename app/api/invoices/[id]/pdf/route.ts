import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
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

    // Create PDF
    const doc = new PDFDocument({
      margin: 50,
      size: "Letter",
    });

    // Collect PDF data
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // Header
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("INVOICE", { align: "left" });

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Invoice #${invoice.invoiceNumber}`, { align: "left" })
      .text(
        `Date: ${new Date(invoice.createdAt).toLocaleDateString()}`,
        { align: "left" }
      )
      .moveDown();

    // Bill To
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("BILL TO", { align: "left" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(invoice.customer.name, { align: "left" })
      .text(invoice.location.address, { align: "left" })
      .text(invoice.customer.phone || "", { align: "left" })
      .text(invoice.customer.email || "", { align: "left" })
      .moveDown();

    // Line items table header
    const tableTop = doc.y;
    const col1 = 50; // Type
    const col2 = 150; // Description
    const col3 = 380; // Qty
    const col4 = 430; // Unit Price
    const col5 = 520; // Total

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Type", col1, tableTop)
      .text("Description", col2, tableTop)
      .text("Qty", col3, tableTop)
      .text("Unit Price", col4, tableTop)
      .text("Total", col5, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;

    // Line items
    invoice.lineItems.forEach((item) => {
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(item.type, col1, y)
        .text(item.description, col2, y)
        .text(String(item.quantity), col3, y, { align: "center" })
        .text(`$${(item.unitPrice / 100).toFixed(2)}`, col4, y, {
          align: "right",
        })
        .text(`$${(item.total / 100).toFixed(2)}`, col5, y, { align: "right" });

      y += 20;
    });

    // Totals
    y += 10;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Subtotal:", col4, y, { align: "right" })
      .text(`$${(invoice.subtotal / 100).toFixed(2)}`, col5, y, {
        align: "right",
      });

    y += 15;
    doc
      .text("Tax (5%):", col4, y, { align: "right" })
      .text(`$${(invoice.tax / 100).toFixed(2)}`, col5, y, {
        align: "right",
      });

    y += 15;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Total:", col4, y, { align: "right" })
      .text(`$${(invoice.total / 100).toFixed(2)}`, col5, y, {
        align: "right",
      });

    // Footer
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Thank you for your business!", 50, 700, { align: "center" });

    doc.end();

    // Wait for PDF to finish
    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("PDF generation error:", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
