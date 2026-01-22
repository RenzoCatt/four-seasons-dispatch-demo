"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopSearch from "../components/TopSearch";

type Customer = { id: string; name: string; phone: string; address: string; notes?: string };
type Technician = { id: string; name: string; status: "Available" | "Busy" };
type WorkOrder = {
  id: string;
  customerId: string;
  jobType: "Service" | "Install";
  description: string;
  status: "New" | "Assigned" | "Complete";
  assignedTechId?: string;
  createdAt: string;
};

export default function WorkOrdersPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [techs, setTechs] = useState<Technician[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [jobType, setJobType] = useState<"Service" | "Install">("Service");
  const [description, setDescription] = useState("");
  const [techId, setTechId] = useState("");

  const customersById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );
  const techsById = useMemo(
    () => Object.fromEntries(techs.map((t) => [t.id, t])),
    [techs]
  );

  async function refresh() {
    const [c, t, w] = await Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/techs").then((r) => r.json()),
      fetch("/api/work-orders").then((r) => r.json()),
    ]);
    setCustomers(c);
    setTechs(t);
    setWorkOrders(w);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createWorkOrder(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        jobType,
        description,
        status: techId ? "Assigned" : "New",
        assignedTechId: techId || undefined,
      }),
    });

    setDescription("");
    setTechId("");
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

  // Filter work orders based on query across: description, status, jobType, customer fields, tech name
  const filteredWorkOrders = workOrders.filter((w) => {
    if (!q) return true;

    const c = customersById[w.customerId];
    const t = w.assignedTechId ? techsById[w.assignedTechId] : null;

    const haystack = [
      w.jobType,
      w.status,
      w.description,
      c?.name,
      c?.phone,
      c?.address,
      c?.notes,
      t?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  const newJobs = filteredWorkOrders.filter((w) => w.status === "New");
  const assignedJobs = filteredWorkOrders.filter((w) => w.status === "Assigned");
  const completeJobs = filteredWorkOrders.filter((w) => w.status === "Complete");

  return (
    <div className="ui-page">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="ui-title">Work Orders</h1>
        <p className="ui-subtitle">Create, assign, and complete jobs.</p>
      </div>

      {/* Search */}
      <TopSearch />

      {q && (
        <p className="text-sm text-gray-500">
          Showing results for: <span className="font-medium">{q}</span>
        </p>
      )}

      {/* Create Work Order */}
      <form onSubmit={createWorkOrder} className="ui-card ui-card-pad space-y-2 max-w-2xl">
        <div className="font-medium">Create Work Order</div>

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

        <select className="ui-select" value={jobType} onChange={(e) => setJobType(e.target.value as any)}>
          <option value="Service">Service</option>
          <option value="Install">Install</option>
        </select>

        <input
          className="ui-input"
          placeholder="Job description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <select className="ui-select" value={techId} onChange={(e) => setTechId(e.target.value)}>
          <option value="">Unassigned (New)</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.status}
            </option>
          ))}
        </select>

        <button className="ui-btn ui-btn-primary ui-btn-block">Save Work Order</button>
      </form>

      {/* Status columns */}
      <div className="grid lg:grid-cols-3 gap-4">
        <StatusColumn
          title="New"
          items={newJobs}
          customersById={customersById}
          techsById={techsById}
          onMarkComplete={markComplete}
        />
        <StatusColumn
          title="Assigned"
          items={assignedJobs}
          customersById={customersById}
          techsById={techsById}
          onMarkComplete={markComplete}
        />
        <StatusColumn
          title="Complete"
          items={completeJobs}
          customersById={customersById}
          techsById={techsById}
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
  techsById,
  onMarkComplete,
}: {
  title: "New" | "Assigned" | "Complete";
  items: WorkOrder[];
  customersById: Record<string, Customer>;
  techsById: Record<string, Technician>;
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
          const t = w.assignedTechId ? techsById[w.assignedTechId] : null;

          return (
            <div key={w.id} className="ui-item">
              <div className="font-medium text-sm">
                {w.jobType} — {c?.name ?? "Unknown"}
              </div>

              <div className="ui-muted">{w.description}</div>

              <div className="text-xs text-gray-500 mt-2">
                {t ? (
                  <>
                    Tech: <span className="font-medium">{t.name}</span>
                  </>
                ) : (
                  "Unassigned"
                )}
              </div>

              {title !== "Complete" && (
                <button
                  type="button"
                  className="ui-btn ui-btn-primary ui-btn-block mt-3"
                  onClick={() => onMarkComplete(w.id)}
                >
                  Mark Complete
                </button>
              )}
            </div>
          );
        })}

        {items.length === 0 && <div className="ui-muted">No jobs in this column.</div>}
      </div>
    </div>
  );
}