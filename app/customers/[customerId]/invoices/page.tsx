"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CustomerNav from "../../components/CustomerNav";

type Invoice = {
  id: string;
  invoiceNumber: number;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  subtotal: number; // cents
  tax: number;      // cents
  total: number;    // cents
  createdAt: string;
  workOrderId?: string;
  jobNumber?: number;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SENT: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    OVERDUE: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export default function CustomerInvoicesPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState<string>("Customer");
  const pageTitle = "Invoices";

  useEffect(() => {
    async function loadInvoices() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/invoices?customerId=${customerId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, [customerId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
        if (!res.ok) return;
        const c = await res.json();
        setCustomerName(
          c.displayName ||
          [c.firstName, c.lastName].filter(Boolean).join(" ") ||
          c.name ||
          "Customer"
        );
      } catch {}
    })();
  }, [customerId]);

  if (loading) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading invoices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paid = invoices.filter((inv) => inv.status === "PAID").reduce((sum, inv) => sum + inv.total, 0);
  const outstanding = total - paid;

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="ui-title">{customerName}</h1>
          <div className="text-sm text-gray-600">{pageTitle}</div>
        </div>
      </div>

      <CustomerNav customerId={customerId} />

      {invoices.length === 0 ? (
        <div className="ui-card ui-card-pad">
          <div className="text-sm text-gray-600">No invoices found for this customer.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="ui-card ui-card-pad">
              <div className="text-xs text-gray-600">Total</div>
              <div className="text-2xl font-bold text-gray-900">{money(total)}</div>
            </div>
            <div className="ui-card ui-card-pad">
              <div className="text-xs text-gray-600">Paid</div>
              <div className="text-2xl font-bold text-green-700">{money(paid)}</div>
            </div>
            <div className="ui-card ui-card-pad">
              <div className="text-xs text-gray-600">Outstanding</div>
              <div className="text-2xl font-bold text-blue-700">{money(outstanding)}</div>
            </div>
          </div>

          <div className="ui-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Job #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/invoices/${inv.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline"
                      >
                        #{inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{inv.jobNumber ? `#${inv.jobNumber}` : "—"}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{money(inv.total)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{fmtDate(inv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
