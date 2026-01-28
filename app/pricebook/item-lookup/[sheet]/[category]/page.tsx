"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Item = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  rates: Array<{
    tier: string;
    unitPrice: string;
  }>;
};

export default function CategoryItemsPage() {
  const { sheet, category } = useParams<{ sheet: string; category: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function loadItems() {
    setLoading(true);
    const res = await fetch(
      `/api/pricebook/sheets/${encodeURIComponent(sheet)}/categories/${encodeURIComponent(
        category
      )}/items?q=${encodeURIComponent(q)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, [sheet, category, q]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="text-sm text-gray-500">
          <Link href="/pricebook/item-lookup" className="hover:underline">
            Price book
          </Link>
          {" • "}
          <Link
            href={`/pricebook/item-lookup/${encodeURIComponent(sheet)}`}
            className="hover:underline"
          >
            {decodeURIComponent(sheet)}
          </Link>
          {" • "}
          {decodeURIComponent(category)}
        </div>
        <h1 className="text-3xl font-semibold">Items</h1>
      </div>

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search items..."
          className="w-full max-w-xl px-3 py-2 border rounded"
        />
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 w-[120px]">Code</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3 w-[120px]">Member</th>
                <th className="text-left p-3 w-[120px]">Standard</th>
                <th className="text-left p-3 w-[120px]">RUMI</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const getPrice = (tier: string) => {
                  const rate = item.rates.find((r) => r.tier === tier);
                  return rate ? `$${parseFloat(rate.unitPrice).toFixed(2)}` : "-";
                };

                return (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-gray-700">{item.code}</td>
                    <td className="p-3">
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{getPrice("MEMBER")}</td>
                    <td className="p-3">{getPrice("STANDARD")}</td>
                    <td className="p-3">{getPrice("RUMI")}</td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
