"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopSearch from "../components/TopSearch";


type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
};

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  async function refresh() {
    const data = await fetch("/api/customers").then((r) => r.json());
    setCustomers(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        address,
        notes,
      }),
    });

    setName("");
    setPhone("");
    setAddress("");
    setNotes("");
    await refresh();
  }

  const filteredCustomers = customers.filter((c) => {
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
<div className="ui-page">
  <div className="space-y-2">
    <h1 className="ui-title">Customers</h1>
    <p className="ui-subtitle">Add and view customer records.</p>
    <TopSearch />
        {q && (
          <p className="text-sm text-gray-500 mt-1">
            Showing results for: <span className="font-medium">{q}</span>
          </p>
        )}
       </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ADD CUSTOMER */}
        <form
          onSubmit={addCustomer}
          className="ui-card ui-card-pad space-y-2"
        >
          <div className="font-medium">Add Customer</div>

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

          <button className="ui-btn ui-btn-primary ui-btn-block">
            Save Customer
          </button>
        </form>

        {/* CUSTOMER LIST */}
        <div className="ui-card ui-card-pad space-y-2">
          <div className="font-medium mb-3">
            Customer List ({filteredCustomers.length})
          </div>

          <div className="space-y-2">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="ui-item"
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-600">{c.phone}</div>
                <div className="text-sm text-gray-600">{c.address}</div>
                {c.notes && (
                  <div className="text-xs text-gray-500 mt-1">
                    {c.notes}
                  </div>
                )}
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="text-sm text-gray-600">
                No customers found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
