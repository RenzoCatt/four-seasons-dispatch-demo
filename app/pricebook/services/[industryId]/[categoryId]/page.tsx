"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Category = { id: string; name: string };

export default function SubcategoriesPage() {
  const { industryId, categoryId } = useParams<{ industryId: string; categoryId: string }>();
  const [subs, setSubs] = useState<Category[]>([]);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch(
      `/api/pricebook/categories?industryId=${industryId}&parentId=${categoryId}`,
      { cache: "no-store" }
    );
    setSubs(await res.json());
  }

  useEffect(() => { load(); }, [industryId, categoryId]);

  async function createSub() {
    const n = name.trim();
    if (!n) return;
    await fetch("/api/pricebook/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industryId, parentId: categoryId, name: n }),
    });
    setName("");
    load();
  }

  return (
    <div className="p-8">
      <div className="text-sm text-gray-500 mb-1">Price book • Services</div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">Subcategories</h1>
        <button onClick={createSub} className="px-4 py-2 rounded bg-blue-600 text-white">
          + Subcategory
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New subcategory name"
          className="w-full max-w-md px-3 py-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {subs.map((s) => (
          <Link
            key={s.id}
            href={`/pricebook/items?categoryId=${s.id}`}
            className="rounded-xl border bg-white hover:shadow-sm transition overflow-hidden"
          >
            <div className="h-36 bg-gray-100" />
            <div className="p-4 font-medium">{s.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
