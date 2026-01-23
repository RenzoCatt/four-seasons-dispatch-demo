"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerNav from "../components/CustomerNav";

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
};

export default function CustomerAccountInfoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState<Customer | null>(null);

  // editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const res = await fetch(`/api/customers/${id}`, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }
    const data = (await res.json()) as Customer;
    setCustomer(data);
    setName(data.name ?? "");
    setPhone(data.phone ?? "");
    setAddress(data.address ?? "");
    setNotes(data.notes ?? "");
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        await load();
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load customer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(closeAfter: boolean) {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, notes }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText);
      }

      const updated = (await res.json()) as Customer;
      setCustomer(updated);

      if (closeAfter) {
        router.push("/customers");
        router.refresh();
      }
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading customer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">
          <div className="font-medium">Could not load customer</div>
          <div className="text-sm text-gray-600 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="ui-title">Edit Customer: {customer.name}</h1>
          <p className="ui-subtitle">Account Info</p>
        </div>

        <div className="flex gap-2">
          <button className="ui-btn" onClick={() => save(true)} disabled={saving}>
            {saving ? "Saving..." : "Save & Close"}
          </button>
          <button className="ui-btn ui-btn-primary" onClick={() => save(false)} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <CustomerNav customerId={id} />

      {error && (
        <div className="mt-4 ui-card ui-card-pad">
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      )}

      <div className="mt-6 ui-card ui-card-pad space-y-4 max-w-4xl">
        <div className="font-medium">Account Info</div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Customer Name</div>
            <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Phone</div>
            <input className="ui-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-gray-600 mb-1">Primary Address</div>
            <input
              className="ui-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-gray-600 mb-1">Internal/Private Notes</div>
            <textarea
              className="ui-input"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
