"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CustomerNav from "../../components/CustomerNav";

type Location = {
  id: string;
  customerId: string;
  name: string;
  address: string;
  notes?: string;
};

export default function CustomerLocationsPage() {
  // IMPORTANT: folder is [customerId], so params key is customerId
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // add form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/customers/${customerId}/locations`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || res.statusText);
    }

    const data = (await res.json()) as Location[];
    setLocations(data);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        await refresh();
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load locations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/customers/${customerId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, notes }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText);
      }

      setName("");
      setAddress("");
      setNotes("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to add location");
    } finally {
      setSaving(false);
    }
  }

  const countLabel = useMemo(
    () => `Service Locations (${locations.length})`,
    [locations.length]
  );

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="ui-title">Service Locations</h1>
          <p className="ui-subtitle">
            Locations for this customer. Work orders should be created from a
            location.
          </p>
        </div>

        <Link href={`/customers/${customerId}`} className="ui-btn">
          Back to Customer
        </Link>
      </div>

      <CustomerNav customerId={customerId} />

      {error && (
        <div className="mt-4 ui-card ui-card-pad">
          <div className="font-medium">Something went wrong</div>
          <div className="text-sm text-gray-600 mt-1">{error}</div>
        </div>
      )}

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Add Location */}
        <form onSubmit={addLocation} className="ui-card ui-card-pad space-y-2">
          <div className="font-medium">Add Location</div>

          <input
            className="ui-input"
            placeholder="Location name (Home, Shop, Rental...)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            className="ui-input"
            placeholder="Service address"
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

          <button
            className="ui-btn ui-btn-primary ui-btn-block"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Location"}
          </button>
        </form>

        {/* Locations List */}
        <div className="lg:col-span-2 ui-card ui-card-pad">
          <div className="font-medium mb-3">{countLabel}</div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="text-sm text-gray-600">No locations yet.</div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="ui-item hover:opacity-90 transition cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    router.push(`/customers/${customerId}/locations/${loc.id}`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(
                        `/customers/${customerId}/locations/${loc.id}`
                      );
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-sm text-gray-600">
                        {loc.address}
                      </div>
                      {loc.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {loc.notes}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        Location ID: {loc.id}
                      </div>
                    </div>

                    {/* action buttons (NOT nested in a Link) */}
                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/locations/${loc.id}/work-orders/new`}
                        className="ui-btn ui-btn-primary"
                      >
                        Create Work Order
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}