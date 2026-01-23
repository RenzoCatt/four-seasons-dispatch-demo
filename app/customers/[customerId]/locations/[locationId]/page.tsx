"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CustomerNav from "../../../components/CustomerNav";

type Location = {
  id: string;
  customerId: string;
  name: string;
  address: string;
  notes?: string;
};

export default function LocationPage() {
  const params = useParams<{ customerId: string; locationId: string }>();
  const router = useRouter();

  const customerId = params.customerId;
  const locationId = params.locationId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [loc, setLoc] = useState<Location | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const res = await fetch(`/api/locations/${locationId}`, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }

    const data = (await res.json()) as Location;
    setLoc(data);
    setName(data.name ?? "");
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
        if (!cancelled) setError(e?.message || "Failed to load location");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  async function save(closeAfter: boolean) {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, notes }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText);
      }

      const updated = (await res.json()) as Location;
      setLoc(updated);

      if (closeAfter) {
        router.push(`/customers/${customerId}/locations`);
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
        <div className="ui-card ui-card-pad">Loading location...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">
          <div className="font-medium">Could not load location</div>
          <div className="text-sm text-gray-600 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!loc) return null;

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="ui-title">Service Location: {loc.name}</h1>
          <p className="ui-subtitle">View and edit location details.</p>
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

      {/* Keep customer tabs visible (Account Info / Service Locations) */}
      <CustomerNav customerId={customerId} />

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Location Details */}
        <div className="lg:col-span-2 ui-card ui-card-pad space-y-4">
          <div className="font-medium">Location Info</div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Location Name</div>
              <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <div className="text-sm text-gray-600 mb-1">Service Address</div>
              <input
                className="ui-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-sm text-gray-600 mb-1">Notes</div>
              <textarea
                className="ui-input"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions panel */}
        <div className="ui-card ui-card-pad space-y-3">
          <div className="font-medium">Actions</div>

          <Link
            href={`/locations/${locationId}/work-orders/new`}
            className="ui-btn ui-btn-primary ui-btn-block"
          >
            New Work Order
          </Link>

          <Link
            href={`/customers/${customerId}/locations`}
            className="ui-btn ui-btn-block"
          >
            Back to Locations
          </Link>

          <div className="text-xs text-gray-400 pt-2">Location ID: {locationId}</div>
        </div>
      </div>
    </div>
  );
}
