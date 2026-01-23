"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopSearch from "../components/TopSearch";

type Customer = { id: string; name: string; phone: string; address: string; notes?: string };

type Location = {
  id: string;
  customerId: string;
  name: string;
  address: string;
  notes?: string;
};

type WorkOrderAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

type WorkOrder = {
  id: string;
  customerId: string;
  locationId?: string;
  jobType: "Service" | "Install";
  description: string;
  status: "New" | "Assigned" | "Complete";
  assignedTechId?: string;
  attachments?: WorkOrderAttachment[];
  createdAt: string;
};

export default function WorkOrdersPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  // NEW: locations for selected customer
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // form
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [jobType, setJobType] = useState<"Service" | "Install">("Service");
  const [description, setDescription] = useState("");

  // NEW: attachments metadata (UI only for now)
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([]);

  const customersById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );

  async function refresh() {
    const [c, w] = await Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/work-orders").then((r) => r.json()),
    ]);
    setCustomers(c);
    setWorkOrders(w);

    // default customer
    if (!customerId && c?.[0]?.id) setCustomerId(c[0].id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load locations whenever customer changes
  useEffect(() => {
    if (!customerId) {
      setLocations([]);
      setLocationId("");
      return;
    }

    (async () => {
      setLoadingLocations(true);
      try {
        const res = await fetch(`/api/customers/${customerId}/locations`, { cache: "no-store" });
        const data = await res.json();
        setLocations(data);

        // pick first location by default
        setLocationId(data?.[0]?.id ?? "");
      } finally {
        setLoadingLocations(false);
      }
    })();
  }, [customerId]);

  async function createWorkOrder(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        locationId: locationId || undefined,
        jobType,
        description,
        status: "New", // no tech assignment yet
        attachments,
      }),
    });

    setDescription("");
    setAttachments([]);
    await refresh();
  }

  async function markComplete(id: string) {
    await fetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Complete" }),
    });
    await refresh();
  }

  function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const next: WorkOrderAttachment[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type || "application/octet-stream",
    }));

    setAttachments((prev) => [...prev, ...next]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  // Filter work orders based on query across: description, status, jobType, customer fields
  const filteredWorkOrders = workOrders.filter((w) => {
    if (!q) return true;

    const c = customersById[w.customerId];

    const haystack = [w.jobType, w.status, w.description, c?.name, c?.phone, c?.address, c?.notes]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  const newJobs = filteredWorkOrders.filter((w) => w.status === "New");
  const assignedJobs = filteredWorkOrders.filter((w) => w.status === "Assigned");
  // const completeJobs = filteredWorkOrders.filter((w) => w.status === "Complete");

  return (
    <div className="ui-page">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="ui-title">Work Orders</h1>
        <p className="ui-subtitle">Create, track, and complete jobs.</p>
      </div>

      {/* Search */}
      <TopSearch />

      {q && (
        <p className="text-sm text-gray-500">
          Showing results for: <span className="font-medium">{q}</span>
        </p>
      )}

      {/* Create Work Order */}
      <form onSubmit={createWorkOrder} className="ui-card ui-card-pad space-y-3 max-w-2xl">
        <div className="font-medium">Job Details</div>

        <div className="space-y-1">
          <div className="text-sm font-medium">Customer</div>
          <select
            className="ui-select"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">Service Location</div>
          <select
            className="ui-select"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={!customerId || loadingLocations}
            required
          >
            {locations.length === 0 ? (
              <option value="">
                {customerId ? "No locations for this customer" : "Select a customer first"}
              </option>
            ) : (
              locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.address}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Job Type</div>
            <select className="ui-select" value={jobType} onChange={(e) => setJobType(e.target.value as any)}>
              <option value="Service">Service</option>
              <option value="Install">Install</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Priority</div>
            <select className="ui-select" value="Normal" disabled>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">Description</div>
          <textarea
            className="ui-input"
            placeholder="What’s the issue / what needs to be done?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{ minHeight: 120 }}
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">Photos / Files</div>
          <input className="ui-input" type="file" multiple onChange={(e) => onPickFiles(e.target.files)} />

          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((a) => (
                <div key={a.id} className="ui-item flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{a.name}</div>
                    <div className="text-xs text-gray-500">
                      {Math.round(a.size / 1024)} KB • {a.type}
                    </div>
                  </div>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={() => removeAttachment(a.id)}>
                    Remove
                  </button>
                </div>
              ))}
              <div className="text-xs text-gray-500">
                (Prototype) These are saved as metadata for now. Later we’ll store files and sync to the tech app.
              </div>
            </div>
          )}
        </div>

        <button className="ui-btn ui-btn-primary ui-btn-block">Save Work Order</button>
      </form>

      {/* Status columns (no Complete column for now) */}
      <div className="grid lg:grid-cols-2 gap-4">
        <StatusColumn title="New" items={newJobs} customersById={customersById} onMarkComplete={markComplete} />
        <StatusColumn
          title="Assigned"
          items={assignedJobs}
          customersById={customersById}
          onMarkComplete={markComplete}
        />
      </div>
    </div>
  );
}

function StatusColumn({
  title,
  items,
  customersById,
  onMarkComplete,
}: {
  title: "New" | "Assigned";
  items: WorkOrder[];
  customersById: Record<string, Customer>;
  onMarkComplete: (id: string) => void;
}) {
  return (
    <div className="ui-card ui-card-pad">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-gray-500">{items.length}</div>
      </div>

      <div className="space-y-2">
        {items.map((w) => {
          const c = customersById[w.customerId];

          return (
            <div key={w.id} className="ui-item">
              <div className="font-medium text-sm">
                {w.jobType} — {c?.name ?? "Unknown"}
              </div>

              <div className="ui-muted">{w.description}</div>

              <div className="text-xs text-gray-500 mt-2">Unassigned</div>

              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-block mt-3"
                onClick={() => onMarkComplete(w.id)}
              >
                Mark Complete
              </button>
            </div>
          );
        })}

        {items.length === 0 && <div className="ui-muted">No jobs in this column.</div>}
      </div>
    </div>
  );
}
