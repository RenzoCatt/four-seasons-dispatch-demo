"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddCustomerPage() {
  const router = useRouter();

  // Customer fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Initial Location fields
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locNotes, setLocNotes] = useState("");

  // Optional Work Order fields
  const [createWO, setCreateWO] = useState(false);
  const [jobType, setJobType] = useState<"Service" | "Install">("Service");
  const [description, setDescription] = useState("");

  // Service location sync
  const [sameAsHome, setSameAsHome] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (sameAsHome) setLocAddress(address);
  }, [address, sameAsHome]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Name, phone, and address are required.");
      return;
    }

    const hasLocation = locName.trim() && locAddress.trim();

    if (createWO) {
      if (!hasLocation) {
        setError("To create a work order, you must add a service location (name + address).");
        return;
      }
      if (!description.trim()) {
        setError("Work order description is required.");
        return;
      }
    }

    setSaving(true);

    try {
      // 1) Create customer
      const resCustomer = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      if (!resCustomer.ok) {
        const txt = await resCustomer.text().catch(() => "");
        throw new Error(txt || "Failed to create customer");
      }

      const customer = await resCustomer.json(); // expects { id, ... }

      let createdLocationId: string | undefined;

      // 2) Create initial location (optional)
      if (hasLocation) {
        const resLoc = await fetch(`/api/customers/${customer.id}/locations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: locName.trim(),
            address: locAddress.trim(),
            notes: locNotes.trim() || undefined,
          }),
        });

        if (!resLoc.ok) {
          const txt = await resLoc.text().catch(() => "");
          throw new Error(txt || "Failed to create location");
        }

        const location = await resLoc.json(); // expects { id, ... }
        createdLocationId = location.id;

        // 3) Create first work order (optional)
        if (createWO) {
          const resWO = await fetch("/api/work-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: customer.id,
              locationId: createdLocationId,
              jobType,
              description: description.trim(),
              status: "New",
              attachments: [],
            }),
          });

          if (!resWO.ok) {
            const txt = await resWO.text().catch(() => "");
            throw new Error(txt || "Failed to create work order");
          }
        }
      }

      // Redirect somewhere useful
      // Option A: go to the customer page (account info)
      router.push(`/customers/${customer.id}`);

      // Option B (if you prefer): go directly to that location page
      // if (createdLocationId) router.push(`/customers/${customer.id}/locations/${createdLocationId}`);
      // else router.push(`/customers/${customer.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ui-page">
      <div className="space-y-2">
        <h1 className="ui-title">Add New Customer</h1>
        <p className="ui-subtitle">Create a new customer record.</p>
      </div>

      <form onSubmit={onSubmit} className="ui-card ui-card-pad space-y-4 max-w-3xl">
        <div className="font-medium">Customer Details</div>

        {error && (
          <div className="ui-item border-red-300 bg-red-50">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <input className="ui-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="ui-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="ui-input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <input className="ui-input" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <hr className="border-black/10" />

        <div className="font-medium">Initial Service Location (optional)</div>

        <input
          className="ui-input"
          placeholder="Location name (Home, Shop, Rental...)"
          value={locName}
          onChange={(e) => setLocName(e.target.value)}
        />

        <div className="space-y-2">
          <input
            className="ui-input"
            placeholder="Service address"
            value={locAddress}
            onChange={(e) => setLocAddress(e.target.value)}
            disabled={sameAsHome}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sameAsHome}
              onChange={(e) => {
                const checked = e.target.checked;
                setSameAsHome(checked);
                if (checked) setLocAddress(address);
              }}
            />
            Same as customer address
          </label>
        </div>

        <input
          className="ui-input"
          placeholder="Notes (optional)"
          value={locNotes}
          onChange={(e) => setLocNotes(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <input
            id="createWO"
            type="checkbox"
            checked={createWO}
            onChange={(e) => setCreateWO(e.target.checked)}
          />
          <label htmlFor="createWO" className="text-sm">
            Create first work order now
          </label>
        </div>

        {createWO && (
          <div className="ui-item">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Job Type</div>
                <select className="ui-select" value={jobType} onChange={(e) => setJobType(e.target.value as any)}>
                  <option value="Service">Service</option>
                  <option value="Install">Install</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-sm font-medium">Description</div>
                <textarea
                  className="ui-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What’s the issue / what needs to be done?"
                  style={{ minHeight: 110 }}
                />
              </div>

              <div className="text-xs text-gray-500 md:col-span-2">
                (Files/photos can be added on the work order page for now — we can also add upload here next.)
              </div>
            </div>
          </div>
        )}

        <button className="ui-btn ui-btn-primary ui-btn-block" disabled={saving}>
          {saving ? "Saving..." : "Save Customer"}
        </button>
      </form>
    </div>
  );
}