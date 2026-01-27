import * as React from "react";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

export const runtime = "nodejs";

const h = React.createElement;

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  logoBox: {
    width: 160,
    height: 60,
    borderWidth: 1,
    borderColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: { alignItems: "flex-end" },
  invoiceTitle: { fontSize: 26, letterSpacing: 1, marginBottom: 4 },
  companyName: { fontSize: 10, fontWeight: 700 },
  muted: { color: "#666" },

  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  billToBox: { width: "52%" },
  metaBox: { width: "44%" },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metaKey: { color: "#333", fontWeight: 700 },
  metaVal: { color: "#111" },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#3a3a3a",
    color: "white",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  thItem: { width: "55%", fontWeight: 700 },
  thQty: { width: "15%", textAlign: "right", fontWeight: 700 },
  thPrice: { width: "15%", textAlign: "right", fontWeight: 700 },
  thAmt: { width: "15%", textAlign: "right", fontWeight: 700 },

  tr: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e6e6e6",
  },
  tdItem: { width: "55%" },
  tdQty: { width: "15%", textAlign: "right" },
  tdPrice: { width: "15%", textAlign: "right" },
  tdAmt: { width: "15%", textAlign: "right" },

  totalsWrap: { marginTop: 16, alignItems: "flex-end" },
  totalsBox: { width: 240 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  totalsRowNoLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totalLabel: { fontWeight: 700 },
  totalValue: { fontWeight: 700 },

  notesTitle: { marginTop: 22, fontWeight: 700, fontSize: 11 },
  notesText: { marginTop: 6, color: "#111", lineHeight: 1.35 },
});

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function InvoicePdfDoc(props: {
  invoiceNumber: number;
  invoiceDate: Date;
  paymentDue: Date;
  billTo: { name: string; address: string; phone?: string | null; email?: string | null };
  company: { name: string; addressLines: string[]; phone?: string | null };
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
}) {
  const amountDue = props.total; // until you track payments, amountDue = total

  const companyAddr = props.company.addressLines.map((line, i) =>
    h(Text, { key: `addr-${i}`, style: styles.muted }, line)
  );

  const phoneLine = props.company.phone
    ? h(Text, { style: styles.muted }, props.company.phone)
    : null;

  const itemRows = props.lineItems.map((li, idx) =>
    h(
      View,
      { key: `li-${idx}`, style: styles.tr },
      h(Text, { style: styles.tdItem }, li.description),
      h(Text, { style: styles.tdQty }, String(li.quantity)),
      h(Text, { style: styles.tdPrice }, money(li.unitPrice)),
      h(Text, { style: styles.tdAmt }, money(li.total))
    )
  );

  const notes = props.notes?.trim() ? props.notes : "Thank you for your business.";

  return h(
    Document,
    null,
    h(
      Page,
      { size: "LETTER", style: styles.page },

      // Header row
      h(
        View,
        { style: styles.headerRow },
        h(
          View,
          { style: styles.logoBox },
          h(Text, { style: { fontSize: 12, fontWeight: 700 } }, "4 Seasons"),
          h(Text, { style: { fontSize: 10 } }, "(logo placeholder)")
        ),
        h(
          View,
          { style: styles.headerRight },
          h(Text, { style: styles.invoiceTitle }, "INVOICE"),
          h(Text, { style: styles.companyName }, props.company.name),
          ...companyAddr,
          phoneLine
        )
      ),

      // Bill to + meta
      h(
        View,
        { style: styles.twoCol },
        h(
          View,
          { style: styles.billToBox },
          h(Text, { style: { fontWeight: 700, marginBottom: 6, color: "#666" } }, "BILL TO"),
          h(Text, { style: { fontWeight: 700, fontSize: 11 } }, props.billTo.name),
          h(Text, { style: styles.muted }, props.billTo.address),
          props.billTo.phone ? h(Text, { style: styles.muted }, props.billTo.phone) : null,
          props.billTo.email ? h(Text, { style: styles.muted }, props.billTo.email) : null
        ),

        h(
          View,
          { style: styles.metaBox },
          h(
            View,
            { style: styles.metaRow },
            h(Text, { style: styles.metaKey }, "Invoice Number:"),
            h(Text, { style: styles.metaVal }, String(props.invoiceNumber))
          ),
          h(
            View,
            { style: styles.metaRow },
            h(Text, { style: styles.metaKey }, "Invoice Date:"),
            h(Text, { style: styles.metaVal }, formatDate(props.invoiceDate))
          ),
          h(
            View,
            { style: styles.metaRow },
            h(Text, { style: styles.metaKey }, "Payment Due:"),
            h(Text, { style: styles.metaVal }, formatDate(props.paymentDue))
          ),
          h(
            View,
            { style: { marginTop: 10, padding: 10, backgroundColor: "#f2f2f2" } },
            h(
              View,
              { style: styles.metaRow },
              h(Text, { style: { ...styles.metaKey, fontSize: 11 } }, "Amount Due (CAD):"),
              h(Text, { style: { ...styles.metaVal, fontSize: 11 } }, money(amountDue))
            )
          )
        )
      ),

      // Table header
      h(
        View,
        { style: styles.tableHeader },
        h(Text, { style: styles.thItem }, "Items"),
        h(Text, { style: styles.thQty }, "Quantity"),
        h(Text, { style: styles.thPrice }, "Price"),
        h(Text, { style: styles.thAmt }, "Amount")
      ),

      // Rows
      ...itemRows,

      // Totals
      h(
        View,
        { style: styles.totalsWrap },
        h(
          View,
          { style: styles.totalsBox },
          h(
            View,
            { style: styles.totalsRow },
            h(Text, { style: styles.muted }, "Subtotal:"),
            h(Text, null, money(props.subtotal))
          ),
          h(
            View,
            { style: styles.totalsRow },
            h(Text, { style: styles.muted }, "Tax:"),
            h(Text, null, money(props.tax))
          ),
          h(
            View,
            { style: styles.totalsRowNoLine },
            h(Text, { style: { ...styles.totalLabel, fontSize: 12 } }, "Total:"),
            h(Text, { style: { ...styles.totalValue, fontSize: 12 } }, money(props.total))
          ),
          h(
            View,
            { style: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10 } },
            h(
              View,
              { style: styles.totalsRowNoLine },
              h(Text, { style: styles.totalLabel }, "Amount Due (CAD):"),
              h(Text, { style: styles.totalValue }, money(amountDue))
            )
          )
        )
      ),

      // Notes
      h(Text, { style: styles.notesTitle }, "Notes / Terms"),
      h(Text, { style: styles.notesText }, notes)
    )
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, location: true, lineItems: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoiceDate = invoice.createdAt ?? new Date();
    const paymentDue = addDays(invoiceDate, 30);

    const doc = InvoicePdfDoc({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate,
      paymentDue,
      billTo: {
        name: invoice.customer?.name ?? "Customer",
        address: invoice.location?.address ?? (invoice as any).locationAddress ?? "",
        phone: invoice.customer?.phone ?? null,
        email: invoice.customer?.email ?? null,
      },
      company: {
        name: "4 Seasons Home Comfort",
        addressLines: ["Lethbridge, AB, Canada"],
        phone: "(403) 329-8440",
      },
      lineItems: (invoice.lineItems ?? []).map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: li.total,
      })),
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      notes: (invoice as any).notes ?? null,
    });

    const buf = await pdf(doc).toBuffer();

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("PDF generation error:", e);
    return NextResponse.json({ error: e?.message ?? "Failed to generate PDF" }, { status: 500 });
  }
}