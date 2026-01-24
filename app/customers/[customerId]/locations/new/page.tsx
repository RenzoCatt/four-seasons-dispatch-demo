"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function NewLocationPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          name: name.trim(),
          address: address.trim(),
          notes: notes.trim(),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      router.push(`/customers/${customerId}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ui-page">
      <div className="ui-card ui-card-pad max-w-xl">
        <h1 className="ui-title mb-6">New Service Location</h1>

        {error && (
          <div className="mb-4 p-3 rounded border border-red-500/20 bg-red-500/10 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Location Name
            </label>
            <input
              type="text"
              className="ui-input w-full"
              value={name}
              disabled={saving}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main office"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Address
            </label>
            <input
              type="text"
              className="ui-input w-full"
              value={address}
              disabled={saving}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Notes (optional)
            </label>
            <textarea
              className="ui-input w-full"
              value={notes}
              disabled={saving}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional location details..."
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="ui-btn ui-btn-primary"
              disabled={!name.trim() || !address.trim() || saving}
            >
              {saving ? "Creating..." : "Create Location"}
            </button>
            <button
              type="button"
              className="ui-btn"
              onClick={() => router.push(`/customers/${customerId}`)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
