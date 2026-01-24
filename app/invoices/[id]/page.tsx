"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type LineItem = {
  id: string;
  type: "LABOR" | "PART" | "FEE";
  description: string;
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

  // add line item form
  const [type, setType] = useState<LineItem["type"]>("LABOR");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState(0); // dollars in UI
  const [saving, setSaving] = useState(false);

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

  const canEdit = invoice?.status === "DRAFT";

  async function addItem() {
    if (!desc.trim()) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          description: desc.trim(),
          quantity: qty,
          unitPriceCents: Math.round(unit * 100),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      setDesc("");
      setQty(1);
      setUnit(0);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add line item");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!confirm("Remove this line item?")) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${id}/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to remove item");
    } finally {
      setSaving(false);
    }
  }

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
              onClick={() => window.open(`/api/invoices/${id}/pdf`, "_blank")}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ui-item p-4">
            <div className="font-semibold mb-3">Bill To</div>
            <div className="text-sm">{invoice.customerName}</div>
            <div className="text-sm text-gray-400 mt-1">{invoice.locationAddress}</div>
            {invoice.phone && <div className="text-sm text-gray-400 mt-1">{invoice.phone}</div>}
            {invoice.email && <div className="text-sm text-gray-400 mt-1">{invoice.email}</div>}
          </div>

          <div className="ui-item p-4">
            <div className="font-semibold mb-3">Totals</div>
            <div className="text-sm flex justify-between mb-2">
              <span className="text-gray-400">Subtotal</span>
              <span>{money(invoice.subtotal)}</span>
            </div>
            <div className="text-sm flex justify-between mb-3">
              <span className="text-gray-400">Tax</span>
              <span>{money(invoice.tax)}</span>
            </div>
            <div className="text-sm flex justify-between font-semibold pt-3 border-t border-white/10">
              <span>Total</span>
              <span className="text-brand-blue">{money(invoice.total)}</span>
            </div>
          </div>
        </div>

        <div className="ui-item">
          <div className="px-4 py-3 border-b border-white/10 font-semibold">Line Items</div>

          <div className="grid grid-cols-[120px_1fr_80px_120px_120px_80px] gap-2 px-4 py-3 text-xs font-semibold text-gray-500">
            <div>Type</div>
            <div>Description</div>
            <div>Qty</div>
            <div>Unit</div>
            <div>Total</div>
            <div />
          </div>

          {invoice.lineItems.map((li) => (
            <div
              key={li.id}
              className="grid grid-cols-[120px_1fr_80px_120px_120px_80px] gap-2 px-4 py-3 border-t border-white/5 items-center text-sm"
            >
              <div className="text-gray-400">{li.type}</div>
              <div className="truncate">{li.description}</div>
              <div className="text-gray-400">{li.quantity}</div>
              <div className="text-gray-400">{money(li.unitPrice)}</div>
              <div>{money(li.total)}</div>
              <div className="text-right">
                <button
                  className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs"
                  disabled={!canEdit || saving}
                  onClick={() => removeItem(li.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {invoice.lineItems.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-600">
              No line items yet.
            </div>
          )}
        </div>

        {canEdit && (
          <div className="ui-item p-4">
            <div className="font-semibold mb-4">Add Line Item</div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  className="ui-input w-full"
                  value={type}
                  disabled={saving}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="LABOR">Labor</option>
                  <option value="PART">Part</option>
                  <option value="FEE">Fee</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  className="ui-input w-full"
                  value={desc}
                  disabled={saving}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Service call labor"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                <input
                  className="ui-input w-full"
                  type="number"
                  value={qty}
                  min={1}
                  disabled={saving}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Unit ($)</label>
                <input
                  className="ui-input w-full"
                  type="number"
                  value={unit}
                  min={0}
                  step="0.01"
                  disabled={saving}
                  onChange={(e) => setUnit(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              className="mt-4 ui-btn ui-btn-primary"
              disabled={saving || !desc.trim()}
              onClick={addItem}
            >
              {saving ? "Saving..." : "Add Item"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
