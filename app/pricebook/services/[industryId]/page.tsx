"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Category = { id: string; name: string };

export default function IndustryCategoriesPage() {
  const { industryId } = useParams<{ industryId: string }>();
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch(`/api/pricebook/categories?industryId=${industryId}`, { cache: "no-store" });
    setCats(await res.json());
  }

  useEffect(() => { load(); }, [industryId]);

  async function createCategory() {
    const n = name.trim();
    if (!n) return;
    await fetch("/api/pricebook/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industryId, parentId: null, name: n }),
    });
    setName("");
    load();
  }

  return (
    <div className="p-8">
      <div className="text-sm text-gray-500 mb-1">Price book • Services</div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">Categories</h1>
        <button onClick={createCategory} className="px-4 py-2 rounded bg-blue-600 text-white">
          + Category
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="w-full max-w-md px-3 py-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cats.map((c) => (
          <Link
            key={c.id}
            href={`/pricebook/services/${industryId}/${c.id}`}
            className="rounded-xl border bg-white hover:shadow-sm transition overflow-hidden"
          >
            <div className="h-36 bg-gray-100" />
            <div className="p-4 font-medium">{c.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
