"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CustomerNav from "../components/CustomerNav";

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
};

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError("");
        const res = await fetch(`/api/customers/${id}`, { cache: "no-store" });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`API ${res.status}: ${text || res.statusText}`);
        }

        const data = (await res.json()) as Customer;

        if (!cancelled) setCustomer(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load customer");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">
          <div className="font-medium">Could not load customer</div>
          <div className="text-sm text-gray-600 mt-1">{error}</div>
          <div className="text-sm text-gray-500 mt-3">
            Check that GET /api/customers/{id} exists.
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading customer...</div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <div className="space-y-2">
        <h1 className="ui-title">{customer.name}</h1>
        <p className="ui-subtitle">Customer profile and actions.</p>
      </div>

      <CustomerNav customerId={id} />

      <div className="mt-6 ui-card ui-card-pad space-y-2">
        <div className="font-medium">Overview</div>
        <div className="text-sm text-gray-700">
          <div>
            <span className="text-gray-500">Phone:</span> {customer.phone}
          </div>
          <div>
            <span className="text-gray-500">Primary Address:</span>{" "}
            {customer.address}
          </div>
          {customer.notes && (
            <div className="pt-2 text-gray-600">{customer.notes}</div>
          )}
        </div>
      </div>
    </div>
  );
}
