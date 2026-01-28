"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TopSearch from "../components/TopSearch";
import { Technician } from "@/lib/store";

type Customer = { id: string; name: string; phone: string; address: string; notes?: string };

type WorkOrder = {
  id: string;
  jobNumber: number;
  customerId: string;
  locationId?: string;
  customerName: string;
  locationAddress: string;
  description: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  completedAt?: string | null;
  assignedTechId?: string | null;
  assignedStartAt?: string | null;
  assignedEndAt?: string | null;
  createdAt: string;
};

function JobsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = (searchParams.get("q") ?? "").toLowerCase();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [techs, setTechs] = useState<any[]>([]);

  const customersById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );

  const techsById = useMemo(
    () => Object.fromEntries(techs.map((t) => [t.id, t])),
    [techs]
  );

  async function refresh() {
    const [c, w, t] = await Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/work-orders").then((r) => r.json()),
      fetch("/api/techs").then((r) => r.json()),
    ]);
    setCustomers(c);
    setWorkOrders(w);
    setTechs(t);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markComplete(id: string) {
    await fetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", completedAt: new Date().toISOString() }),
    });
    await refresh();
  }

  // Filter work orders based on query across: description, status, jobType, customer fields
  const filteredWorkOrders = workOrders.filter((w) => {
    if (!q) return true;

    const c = customersById[w.customerId];

    const haystack = [w.description, w.status, w.description, c?.name, c?.phone, c?.address, c?.notes]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  const completedJobs = filteredWorkOrders.filter((w) => w.status === "COMPLETED");
  const assignedJobs = filteredWorkOrders.filter(
    (w) => w.status !== "COMPLETED" && w.assignedTechId
  );
  const newJobs = filteredWorkOrders.filter(
    (w) => w.status !== "COMPLETED" && !w.assignedTechId
  );

  return (
    <div className="ui-page">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="ui-title">Jobs</h1>
        <p className="ui-subtitle">Track jobs by status.</p>
      </div>

      {/* Search */}
      <TopSearch />

      {q && (
        <p className="text-sm text-gray-500">
          Showing results for: <span className="font-medium">{q}</span>
        </p>
      )}

      {/* Create Job Card */}
      <div className="ui-card ui-card-pad flex items-center justify-between">
        <div>
          <div className="font-semibold">Create new job</div>
          <div className="text-sm text-gray-600 mt-1">
            Start by selecting a customer, then choose the service location.
          </div>
        </div>

        <button
          className="ui-btn ui-btn-primary"
          onClick={() => router.push("/customers?createJob=1")}
        >
          Create Job
        </button>
      </div>

      {/* Status columns */}
      <div className="mt-4 grid lg:grid-cols-3 gap-4">
        <StatusColumn
          router={router}
          title="New"
          items={newJobs}
          customersById={customersById}
          techsById={techsById}
          onMarkComplete={markComplete}
        />

        <StatusColumn
          router={router}
          title="Assigned"
          items={assignedJobs}
          customersById={customersById}
          techsById={techsById}
          onMarkComplete={markComplete}
        />

        <StatusColumn
          router={router}
          title="Completed"
          items={completedJobs}
          customersById={customersById}
          techsById={techsById}
          onMarkComplete={markComplete}
        />
      </div>
    </div>
  );
}

function StatusColumn({
  router,
  title,
  items,
  customersById,
  techsById,
  onMarkComplete,
}: {
  router: ReturnType<typeof useRouter>;
  title: "New" | "Assigned" | "Completed";
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
              <button
                type="button"
                onClick={() => router.push(`/jobs/${w.id}`)}
                className="w-full text-left hover:opacity-90 transition"
              >
                <div className="font-medium text-sm">
                  Job #{w.jobNumber} — {c?.name ?? "Unknown"}
                </div>

                <div className="ui-muted">{w.description}</div>

                <div className="text-xs text-gray-500 mt-2">
                  {w.assignedTechId ? (
                    <>
                      <span className="block">
                        Tech: <span className="font-medium text-white">{t?.name ?? "Unknown"}</span>
                      </span>
                      {w.assignedStartAt && (
                        <span className="block text-gray-400 mt-0.5">
                          {new Date(w.assignedStartAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </>
                  ) : (
                    "Unassigned"
                  )}
                </div>
              </button>

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

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="ui-page">Loading...</div>}>
      <JobsPageContent />
    </Suspense>
  );
}
