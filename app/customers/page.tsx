"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

export default function CustomersListPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase();

  const [customers, setCustomers] = useState<Customer[]>([]);

  async function refresh() {
    const data = await fetch("/api/customers").then((r) => r.json());
    setCustomers(data);
  }

  useEffect(() => {
    refresh();
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

  return (
    <div className="ui-page">
      <CustomersSubtabs />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="ui-title">Customer List</h1>
          <p className="ui-subtitle">Manage your customer accounts and history.</p>
        </div>

        <Link href="/customers/new" className="ui-btn ui-btn-primary">
          Add New Customer
        </Link>
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
  <Link
    key={c.id}
    href={`/customers/${c.id}`}
    className="block ui-item hover:opacity-90 transition"
  >
    <div className="font-medium">{c.name}</div>
    <div className="text-sm text-gray-600">{c.phone}</div>
    <div className="text-sm text-gray-600">{c.address}</div>
    {c.notes && <div className="text-xs text-gray-500 mt-1">{c.notes}</div>}
  </Link>
))}

          {filteredCustomers.length === 0 && (
            <div className="text-sm text-gray-600">No customers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
