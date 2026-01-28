"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LineItemsCard from "@/app/components/LineItemsCard";

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

        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <LineItemsCard
            items={invoice.lineItems}
            taxRate={0.05}
            readOnly={!canEdit}
            onRemove={canEdit ? removeItem : undefined}
            disabled={!canEdit || saving}
            title="Line Items"
            descriptionField="description"
            typeField="type"
            qtyField="quantity"
            unitPriceField="unitPrice"
            taxableField="taxable"
            moneyFormatter={money}
          />
        )}

        {canEdit && (
          <div className="ui-item p-4">
            <div className="font-semibold mb-3">Add Line Item</div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400">Type</label>
                <select
                  className="ui-input w-full mt-1"
                  value={type}
                  onChange={(e) => setType(e.target.value as LineItem["type"])}
                  disabled={saving}
                >
                  <option value="LABOR">Labor</option>
                  <option value="PART">Part</option>
                  <option value="FEE">Fee</option>
                </select>
              </div>

              <div className="md:col-span-6">
                <label className="text-xs text-gray-400">Description</label>
                <input
                  className="ui-input w-full mt-1"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Service call labor"
                  disabled={saving}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-400">Qty</label>
                <input
                  className="ui-input w-full mt-1"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  disabled={saving}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-400">Unit ($)</label>
                <input
                  className="ui-input w-full mt-1"
                  type="number"
                  step="0.01"
                  value={unit}
                  onChange={(e) => setUnit(Number(e.target.value))}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="mt-3">
              <button className="ui-btn ui-btn-primary" disabled={saving} onClick={addItem}>
                {saving ? "Adding..." : "Add Item"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
