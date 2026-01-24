"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type InvoiceDetail = {
  id: string;
  invoiceNumber: number;
  status: string;
  createdAt: string;
  customerName: string;
  phone: string;
  email: string;
  locationAddress: string;
  subtotal: number;
  tax: number;
  total: number;
  lineItems: {
    id: string;
    type: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/portal/invoices/${token}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        setInvoice(await res.json());
      } catch (e: any) {
        setError(e?.message ?? "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );

  if (error || !invoice)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">
          {error || "Invoice not found"}
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white text-gray-900 rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Invoice</h1>
              <p className="text-gray-600 text-sm">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium">
                {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">BILL TO</h3>
          <div className="text-sm">
            <p className="font-medium">{invoice.customerName}</p>
            <p>{invoice.locationAddress}</p>
            <p>{invoice.phone}</p>
            <p>{invoice.email}</p>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-8">
          <table className="w-full text-sm">
            <thead className="border-t-2 border-b border-gray-200">
              <tr className="text-gray-700">
                <th className="text-left py-2 font-semibold">Type</th>
                <th className="text-left py-2 font-semibold">Description</th>
                <th className="text-right py-2 font-semibold">Qty</th>
                <th className="text-right py-2 font-semibold">Unit Price</th>
                <th className="text-right py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3">{item.type}</td>
                  <td className="py-3">{item.description}</td>
                  <td className="text-right py-3">{item.quantity}</td>
                  <td className="text-right py-3">{money(item.unitPrice)}</td>
                  <td className="text-right py-3 font-medium">
                    {money(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-2 border-t border-gray-200">
              <span>Subtotal:</span>
              <span>{money(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span>Tax (5%):</span>
              <span>{money(invoice.tax)}</span>
            </div>
            <div className="flex justify-between py-3 text-lg font-bold">
              <span>Total:</span>
              <span>{money(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
          <p>Thank you for your business!</p>
          <p className="mt-2">Invoice Status: {invoice.status}</p>
        </div>
      </div>
    </div>
  );
}
