"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Industry = { id: string; name: string };

export default function PricebookServicesPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/pricebook/industries", { cache: "no-store" });
    setIndustries(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function createIndustry() {
    const n = name.trim();
    if (!n) return;
    await fetch("/api/pricebook/industries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n }),
    });
    setName("");
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-gray-500">Price book • Services</div>
          <h1 className="text-3xl font-semibold">Services</h1>
        </div>

        <div className="flex gap-2">
          <Link
            href="/pricebook/import"
            className="px-4 py-2 rounded border bg-white hover:bg-gray-50"
          >
            Import CSV
          </Link>
          <button
            onClick={createIndustry}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + Industry
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New industry name (e.g., Heating & Air Conditioning)"
          className="w-full max-w-xl px-3 py-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {industries.map((i) => (
          <Link
            key={i.id}
            href={`/pricebook/services/${i.id}`}
            className="rounded-xl border bg-white hover:shadow-sm transition overflow-hidden"
          >
            <div className="h-40 bg-gray-100" />
            <div className="p-4 font-medium">{i.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
