"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerNav from "../components/CustomerNav";

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
};

type Location = {
  id: string;
  customerId: string;
  name: string;
  address: string;
  notes?: string;
};

export default function CustomerAccountInfoPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // add location form
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locNotes, setLocNotes] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  async function load() {
    const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
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

  async function loadLocations() {
    try {
      setLoadingLocations(true);
      const res = await fetch(`/api/customers/${customerId}/locations`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load locations");
      const data = (await res.json()) as Location[];
      setLocations(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load locations");
    } finally {
      setLoadingLocations(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([load(), loadLocations()]);
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
  }, [customerId]);

  async function save(closeAfter: boolean) {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/customers/${customerId}`, {
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

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    setSavingLocation(true);
    setError("");

    try {
      const res = await fetch(`/api/customers/${customerId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: locName, address: locAddress, notes: locNotes }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText);
      }

      setLocName("");
      setLocAddress("");
      setLocNotes("");
      await loadLocations();
    } catch (e: any) {
      setError(e?.message || "Failed to add location");
    } finally {
      setSavingLocation(false);
    }
  }

  if (loading) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading customer...</div>
      </div>
    );
  }

  if (error && !customer) {
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

      <CustomerNav customerId={customerId} />

      {error && (
        <div className="mt-4 ui-card ui-card-pad">
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* LEFT SIDE: Account Info */}
        <main className="col-span-12 lg:col-span-8">
          {/* Account Info Card */}
          <div className="ui-card ui-card-pad space-y-4">
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
        </main>

        {/* RIGHT SIDE: Locations (Sticky) */}
        <aside className="col-span-12 lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            {/* Service Locations Card */}
            <div className="ui-card ui-card-pad">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Service Locations</div>
                <div className="text-xs text-gray-500">{locations.length}</div>
              </div>

              {loadingLocations ? (
                <div className="text-sm text-gray-600">Loading...</div>
              ) : locations.length === 0 ? (
                <div className="text-sm text-gray-500 py-4">No locations yet. Add one below.</div>
              ) : (
                <div className="space-y-2">
                  {locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="ui-item hover:opacity-90 transition cursor-pointer p-3 text-sm"
                      onClick={() => router.push(`/customers/${customerId}/locations/${loc.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/customers/${customerId}/locations/${loc.id}`);
                        }
                      }}
                    >
                      <div className="font-medium text-sm">{loc.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{loc.address}</div>
                      {loc.notes && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-1">{loc.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Location Card */}
            <form onSubmit={addLocation} className="ui-card ui-card-pad space-y-4">
              <div className="font-medium">Add Service Location</div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Location Name</div>
                  <input
                    className="ui-input"
                    placeholder="Home, Shop, Rental..."
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">Address</div>
                  <input
                    className="ui-input"
                    placeholder="Service address"
                    value={locAddress}
                    onChange={(e) => setLocAddress(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">Notes (optional)</div>
                  <input
                    className="ui-input"
                    placeholder="Special instructions, gate code, etc."
                    value={locNotes}
                    onChange={(e) => setLocNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="ui-btn ui-btn-primary w-full"
                  disabled={savingLocation}
                >
                  {savingLocation ? "Saving..." : "Add Location"}
                </button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
