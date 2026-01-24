"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InvoiceRow = {
  id: string;
  invoiceNumber: number;
  status: "DRAFT" | "SENT" | "PAID" | "VOID";
  total: number; // cents
  createdAt: string;
  customerName: string;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-500/20 text-gray-300",
    SENT: "bg-blue-500/20 text-blue-300",
    PAID: "bg-green-500/20 text-green-300",
    VOID: "bg-red-500/20 text-red-300",
  };
  return colors[status] || "bg-gray-500/20 text-gray-300";
}

export default function InvoiceDashboardPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/invoices", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      setRows(await res.json());
    } catch (e: any) {
      setError(e?.message ?? "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="ui-card ui-card-pad">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="ui-title">Invoice Dashboard</h1>
          <p className="ui-subtitle">View and manage created invoices.</p>
        </div>

        <Link
          href="/reports/invoices/create"
          className="ui-btn ui-btn-primary"
        >
          Create Invoices
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-500/20 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="ui-item">
        <div className="grid grid-cols-[120px_1fr_120px_140px_140px] gap-3 px-4 py-3 text-xs font-semibold text-gray-500 border-b border-white/10">
          <div>Invoice #</div>
          <div>Customer</div>
          <div>Status</div>
          <div>Total</div>
          <div>Created</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-gray-600">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-600">No invoices yet.</div>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              href={`/invoices/${r.id}`}
              className="grid grid-cols-[120px_1fr_120px_140px_140px] gap-3 px-4 py-3 border-t border-white/5 hover:bg-white/5 transition items-center text-sm"
            >
              <div className="font-medium">#{r.invoiceNumber}</div>
              <div className="truncate">{r.customerName}</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge(r.status)}`}>
                  {r.status}
                </span>
              </div>
              <div className="font-medium">{money(r.total)}</div>
              <div className="text-gray-400">
                {new Date(r.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
