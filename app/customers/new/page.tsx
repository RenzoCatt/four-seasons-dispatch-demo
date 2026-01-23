"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CustomersSubtabs from "../components/CustomersSubtabs";


export default function AddCustomerPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, notes }),
      });

      router.push("/customers"); // go back to list
      router.refresh(); // ensures fresh data if your list page caches
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ui-page">
        <CustomersSubtabs />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="ui-title">Add New Customer</h1>
          <p className="ui-subtitle">Create a new customer record.</p>
        </div>

        <Link href="/customers" className="ui-btn">
          Back to Customer List
        </Link>
      </div>

      <form onSubmit={addCustomer} className="mt-6 ui-card ui-card-pad space-y-2 max-w-xl">
        <div className="font-medium">Customer Details</div>

        <input
          className="ui-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="ui-input"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <input
          className="ui-input"
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <input
          className="ui-input"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button className="ui-btn ui-btn-primary ui-btn-block" disabled={saving}>
          {saving ? "Saving..." : "Save Customer"}
        </button>
      </form>
    </div>
  );
}
