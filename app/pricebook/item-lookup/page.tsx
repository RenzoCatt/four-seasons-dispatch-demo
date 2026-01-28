"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Sheet = { sheet: string; count: number };

export default function PricebookItemLookupPage() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/pricebook/sheets", { cache: "no-store" });
      const data = await res.json();
      setSheets(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="text-sm text-gray-500">Price book</div>
        <h1 className="text-3xl font-semibold">Item lookup</h1>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sheets.map((s) => (
            <Link
              key={s.sheet}
              href={`/pricebook/item-lookup/${encodeURIComponent(s.sheet)}`}
              className="rounded-xl border bg-white hover:shadow-sm transition overflow-hidden"
            >
              <div className="h-40 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <div className="text-4xl font-bold text-blue-600">{s.sheet}</div>
              </div>
              <div className="p-4">
                <div className="font-medium">{s.sheet}</div>
                <div className="text-sm text-gray-500">{s.count} items</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
