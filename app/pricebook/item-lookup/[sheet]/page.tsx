"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Category = { category: string; count: number };

export default function SheetCategoriesPage() {
  const { sheet } = useParams<{ sheet: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/pricebook/sheets/${encodeURIComponent(sheet)}/categories`, {
        cache: "no-store",
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, [sheet]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="text-sm text-gray-500">
          <Link href="/pricebook/item-lookup" className="hover:underline">
            Price book
          </Link>
          {" • "}
          {decodeURIComponent(sheet)}
        </div>
        <h1 className="text-3xl font-semibold">Categories</h1>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((c) => (
            <Link
              key={c.category}
              href={`/pricebook/item-lookup/${encodeURIComponent(sheet)}/${encodeURIComponent(
                c.category
              )}`}
              className="rounded-xl border bg-white hover:shadow-sm transition overflow-hidden"
            >
              <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100" />
              <div className="p-4">
                <div className="font-medium">{c.category}</div>
                <div className="text-sm text-gray-500">{c.count} items</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
