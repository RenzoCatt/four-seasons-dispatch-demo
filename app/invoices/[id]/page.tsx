"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type LineItem = {
  id: string;
  type: "LABOR" | "PART" | "FEE";
  description: string;
  details?: string | null;
  quantity: number;
  unitPrice: number; // cents
  total: number; // cents
};

type Invoice = {
  id: string;
  invoiceNumber: number;
  status: "DRAFT" | "SENT" | "PAID" | "VOID";
  createdAt: string;

  customerName: string;
  phone: string;
  email: string;
  locationAddress: string;

  subtotal: number;
  tax: number;
  total: number;

  publicToken?: string;

  lineItems: LineItem[];
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copying, setCopying] = useState(false);
  const [sending, setSending] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson(`/api/invoices/${id}`);
      setInvoice(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [id]);

  async function markSent() {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
      alert("Invoice marked as Sent.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to send invoice");
    } finally {
      setSending(false);
    }
  }

  async function copyPortalLink() {
    if (!invoice?.publicToken) {
      setError("Generate portal link by sending invoice first");
      return;
    }

    setCopying(true);
    try {
      const url = `${window.location.origin}/portal/invoices/${invoice.publicToken}`;
      await navigator.clipboard.writeText(url);
      alert("Portal link copied to clipboard!");
    } catch (e: any) {
      setError("Failed to copy link");
    } finally {
      setCopying(false);
    }
  }

  async function sendEmail() {
    if (!invoice?.publicToken) {
      setError("Generate portal link by sending invoice first");
      return;
    }

    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Invoice email sent!");
    } catch (e: any) {
      setError(e?.message ?? "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  async function openPdf() {
    const res = await fetch(`/api/invoices/${id}/pdf`, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  if (loading) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading…</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">
          <div className="text-sm text-red-400 mb-4">{error || "Invoice not found"}</div>
          <button className="ui-btn" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const taxRate = 0.05;

  const computedSubtotal =
    invoice.lineItems?.reduce((sum, it) => {
      const rowTotal =
        typeof it.total === "number" ? it.total : Math.round(it.quantity * it.unitPrice);
      return sum + rowTotal;
    }, 0) ?? 0;

  // If API totals are coming back as 0 but we have line items, use computed totals.
  const subtotalCents =
    invoice.lineItems?.length ? (invoice.subtotal || computedSubtotal) : invoice.subtotal;

  const taxCents =
    invoice.lineItems?.length
      ? (invoice.tax || Math.round(subtotalCents * taxRate))
      : invoice.tax;

  const totalCents =
    invoice.lineItems?.length ? (invoice.total || subtotalCents + taxCents) : invoice.total;

  return (
    <div className="ui-page">
      <div className="ui-card ui-card-pad space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="ui-title">Invoice #{invoice.invoiceNumber}</div>
            <div className="text-sm text-gray-400 mt-1">
              Status: <span className="font-medium text-white">{invoice.status}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="ui-btn"
              onClick={() => openPdf().catch(e => setError(e.message))}
            >
              View PDF
            </button>

            {invoice.status !== "DRAFT" && (
              <button
                className="ui-btn"
                disabled={copying}
                onClick={copyPortalLink}
              >
                {copying ? "Copying..." : "Copy Portal Link"}
              </button>
            )}

            {invoice.status !== "DRAFT" && invoice.email && (
              <button
                className="ui-btn"
                disabled={sending}
                onClick={sendEmail}
              >
                {sending ? "Sending..." : "Send Email"}
              </button>
            )}

            <button
              className="ui-btn"
              onClick={() => window.print()}
            >
              Print
            </button>

            <button
              className="ui-btn ui-btn-primary"
              disabled={invoice.status !== "DRAFT" || sending}
              onClick={markSent}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded border border-red-500/20 bg-red-500/10 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="ui-item p-4">
          <div className="font-semibold mb-3 text-gray-900">Bill To</div>
          <div className="text-sm text-gray-900">{invoice.customerName}</div>
          <div className="text-sm text-gray-600 mt-1">{invoice.locationAddress}</div>
          {invoice.phone && <div className="text-sm text-gray-600 mt-1">{invoice.phone}</div>}
          {invoice.email && <div className="text-sm text-gray-600 mt-1">{invoice.email}</div>}
        </div>

        <div className="ui-item p-0 overflow-hidden">
          {/* Header row (readable) */}
          <div className="w-full border-b border-gray-300 px-4 py-3 bg-gray-200">
            <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide text-gray-700">
              <div className="col-span-8">Services</div>
              <div className="col-span-1 text-right">qty</div>
              <div className="col-span-1 text-right">unit price</div>
              <div className="col-span-2 text-right">amount</div>
            </div>
          </div>

          {invoice.lineItems?.length ? (
            <div className="divide-y divide-gray-200">
              {invoice.lineItems.map((it) => {
                const rowTotal =
                  typeof it.total === "number" ? it.total : Math.round(it.quantity * it.unitPrice);

                return (
                  <div key={it.id} className="px-4 py-4">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Left: title + details */}
                      <div className="col-span-12 md:col-span-8">
                        <div className="text-sm font-semibold text-gray-900">
                          {it.description || "(Untitled service)"}
                        </div>

                        {it.details && (
                          <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">
                            {it.details}
                          </div>
                        )}
                      </div>

                      {/* Right: qty / unit / amount */}
                      <div className="col-span-4 md:col-span-1 text-right text-sm text-gray-900">
                        {it.quantity}
                      </div>

                      <div className="col-span-4 md:col-span-1 text-right text-sm text-gray-900">
                        {money(it.unitPrice)}
                      </div>

                      <div className="col-span-4 md:col-span-2 text-right text-sm font-semibold text-gray-900">
                        {money(rowTotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-4 text-sm text-gray-500">No items</div>
          )}
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-sm ui-item p-4">
            <div className="text-sm flex justify-between mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{money(subtotalCents)}</span>
            </div>
            <div className="text-sm flex justify-between mb-3">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">{money(taxCents)}</span>
            </div>
            <div className="text-sm flex justify-between font-semibold pt-3 border-t border-gray-300">
              <span className="text-gray-900">Total</span>
              <span className="text-brand-blue">{money(totalCents)}</span>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
