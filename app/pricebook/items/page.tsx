"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Tier = "STANDARD" | "MEMBER" | "RUMI";

type Rate = {
  id?: string;
  tier: Tier;
  unitPrice: number;
  hours?: number | null;
  hourlyRate?: number | null;
  equipment?: number | null;
  materialMarkup?: number | null;
};

type Item = {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  rates: Rate[];
};

const TIERS: Tier[] = ["STANDARD", "MEMBER", "RUMI"];

function PricebookItemsContent() {
  const sp = useSearchParams();
  const categoryId = sp.get("categoryId");
  const [q, setQ] = useState(sp.get("q") || "");
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);

  async function load() {
    const url =
      q.trim().length > 0
        ? `/api/pricebook/items?q=${encodeURIComponent(q.trim())}`
        : `/api/pricebook/items?categoryId=${encodeURIComponent(categoryId || "")}`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, [categoryId]);

  const rows = useMemo(() => items, [items]);

  function ensureTierRates(item: Item): Item {
    const map = new Map(item.rates.map((r) => [r.tier, r]));
    const filled = TIERS.map((t) => map.get(t) || { tier: t, unitPrice: 0 });
    return { ...item, rates: filled };
  }

  async function saveSelected() {
    if (!selected) return;

    const payload = {
      name: selected.name,
      code: selected.code,
      description: selected.description,
      unit: selected.unit,
      rates: selected.rates.map((r) => ({
        tier: r.tier,
        unitPrice: Number(r.unitPrice || 0),
        hours: r.hours ?? null,
        hourlyRate: r.hourlyRate ?? null,
        equipment: r.equipment ?? null,
        materialMarkup: r.materialMarkup ?? null,
      })),
    };

    const res = await fetch(`/api/pricebook/items/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to save");
      return;
    }

    setSelected(null);
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-gray-500">Price book • Items</div>
          <h1 className="text-3xl font-semibold">Items</h1>
        </div>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items (e.g., duct clean)"
            className="px-3 py-2 border rounded w-72"
          />
          <button
            onClick={load}
            className="px-4 py-2 rounded bg-white border hover:bg-gray-50"
          >
            Search
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3 w-[120px]">Code</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3 w-[140px]">Standard</th>
              <th className="text-left p-3 w-[140px]">Member</th>
              <th className="text-left p-3 w-[140px]">RUMI</th>
              <th className="p-3 w-[120px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => {
              const fixed = ensureTierRates(it);
              const get = (t: Tier) => fixed.rates.find((r) => r.tier === t)?.unitPrice ?? 0;

              return (
                <tr key={it.id} className="border-t">
                  <td className="p-3 text-gray-700">{it.code || "-"}</td>
                  <td className="p-3">
                    <div className="font-medium">{it.name}</div>
                    {it.description ? (
                      <div className="text-gray-500 line-clamp-1">{it.description}</div>
                    ) : null}
                  </td>
                  <td className="p-3">${get("STANDARD").toFixed(2)}</td>
                  <td className="p-3">${get("MEMBER").toFixed(2)}</td>
                  <td className="p-3">${get("RUMI").toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelected(ensureTierRates(it))}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Edit Item</div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-black">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="px-3 py-2 border rounded"
                  value={selected.name}
                  onChange={(e) => setSelected({ ...selected, name: e.target.value })}
                  placeholder="Name"
                />
                <input
                  className="px-3 py-2 border rounded"
                  value={selected.code || ""}
                  onChange={(e) => setSelected({ ...selected, code: e.target.value })}
                  placeholder="Code (optional)"
                />
              </div>

              <input
                className="px-3 py-2 border rounded w-full"
                value={selected.description || ""}
                onChange={(e) => setSelected({ ...selected, description: e.target.value })}
                placeholder="Description (optional)"
              />

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-sm font-medium">Rates</div>
                <div className="p-3 space-y-2">
                  {selected.rates.map((r, idx) => (
                    <div key={r.tier} className="grid grid-cols-4 gap-2 items-center">
                      <div className="text-sm font-medium">{r.tier}</div>
                      <input
                        type="number"
                        step="0.01"
                        className="px-3 py-2 border rounded col-span-3"
                        value={r.unitPrice}
                        onChange={(e) => {
                          const next = [...selected.rates];
                          next[idx] = { ...r, unitPrice: Number(e.target.value) };
                          setSelected({ ...selected, rates: next });
                        }}
                        placeholder="Unit price"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded border bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSelected}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricebookItemsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PricebookItemsContent />
    </Suspense>
  );
}
