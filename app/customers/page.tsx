"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopSearch from "../components/TopSearch";
import CustomersSubtabs from "./components/CustomersSubtabs";


type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
};

function CustomersListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const createJobMode = searchParams.get("createJob") === "1";

  const [customers, setCustomers] = useState<Customer[]>([]);

async function refresh() {
  const res = await fetch("/api/customers", { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  // if server accidentally returns empty body
  const raw = await res.text();
  if (!raw) throw new Error("API returned empty response body");

  const data = JSON.parse(raw);
  setCustomers(data);
}

useEffect(() => {
  (async () => {
    try {
      await refresh();
    } catch (e) {
      console.error(e);
    }
  })();
}, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, q]);

  function onCustomerClick(id: string) {
    if (createJobMode) {
      router.push(`/customers/${id}/work-orders/new`);
    } else {
      router.push(`/customers/${id}`);
    }
  }

  return (
    <div className="ui-page">
      <CustomersSubtabs />

      {createJobMode && (
        <div className="ui-card ui-card-pad mb-4">
          <div className="font-semibold">Step 1: Select customer</div>
          <div className="text-sm text-gray-600 mt-1">
            Click a customer to choose a service location and create a job.
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="ui-title">Customer List</h1>
          <p className="ui-subtitle">Manage your customer accounts and history.</p>
        </div>

        {!createJobMode && (
          <Link href="/customers/new" className="ui-btn ui-btn-primary">
            Add New Customer
          </Link>
        )}
      </div>

      <div className="mt-4">
        <TopSearch />
        {q && (
          <p className="text-sm text-gray-500 mt-1">
            Showing results for: <span className="font-medium">{q}</span>
          </p>
        )}
      </div>

      <div className="mt-6 ui-card ui-card-pad space-y-3">
        <div className="font-medium">Customers ({filteredCustomers.length})</div>

        <div className="space-y-2">
{filteredCustomers.map((c) => (
  <div
    key={c.id}
    className="ui-item flex items-start justify-between gap-3"
  >
    <button
      type="button"
      onClick={() => onCustomerClick(c.id)}
      className="flex-1 text-left hover:opacity-90 transition"
    >
      <div className="font-medium">{c.name}</div>
      <div className="text-sm text-gray-600">{c.phone}</div>
      <div className="text-sm text-gray-600">{c.address}</div>
      {c.notes && <div className="text-xs text-gray-500 mt-1">{c.notes}</div>}
    </button>

    {createJobMode && (
      <button
        type="button"
        className="ui-btn ui-btn-primary whitespace-nowrap"
        onClick={() => router.push(`/customers/${c.id}/work-orders/new`)}
      >
        Select
      </button>
    )}
  </div>
))}

          {filteredCustomers.length === 0 && (
            <div className="text-sm text-gray-600">No customers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomersListPage() {
  return (
    <Suspense fallback={<div className="ui-page">Loading...</div>}>
      <CustomersListContent />
    </Suspense>
  );
}
