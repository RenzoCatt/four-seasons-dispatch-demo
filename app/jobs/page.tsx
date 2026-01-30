"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Customer = { id: string; name: string; phone: string; address: string; notes?: string };
type Tech = { id: string; name: string };

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

  // Optional future fields (won’t break if missing)
  jobAmount?: number | null;
  dueAmount?: number | null;
};

function fmtDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
}

function getDisplayStatus(w: WorkOrder): string {
  if (w.completedAt) return "COMPLETED";
  if (w.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (!w.assignedTechId) return "UNASSIGNED";
  if (w.assignedStartAt) return "SCHEDULED";
  return "NEW";
}

function statusPill(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    UNASSIGNED: { label: "Unassigned", cls: "bg-gray-200 text-gray-700" },
    SCHEDULED: { label: "Scheduled", cls: "bg-blue-100 text-blue-700" },
    IN_PROGRESS: { label: "In progress", cls: "bg-yellow-100 text-yellow-700" },
    COMPLETED: { label: "Completed", cls: "bg-green-100 text-green-700" },
    NEW: { label: "New", cls: "bg-gray-100 text-gray-600" },
    CANCELED: { label: "Canceled", cls: "bg-red-100 text-red-700" },
  };

  const cfg = map[status] ?? map.NEW;
  return <span className={`text-xs px-2 py-1 rounded font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

function JobsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);

  const customersById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );
  const techsById = useMemo(() => Object.fromEntries(techs.map((t) => [t.id, t])), [techs]);

  async function refresh() {
    setLoading(true);
    try {
      const [cRes, wRes, tRes] = await Promise.all([
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/work-orders", { cache: "no-store" }),
        fetch("/api/techs", { cache: "no-store" }),
      ]);
      const c = cRes.ok ? await cRes.json() : [];
      const w = wRes.ok ? await wRes.json() : [];
      const t = tRes.ok ? await tRes.json() : [];
      setCustomers(Array.isArray(c) ? c : []);
      setWorkOrders(Array.isArray(w) ? w : []);
      setTechs(Array.isArray(t) ? t : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return workOrders;

    return workOrders.filter((w) => {
      const c = customersById[w.customerId];
      const t = w.assignedTechId ? techsById[w.assignedTechId] : null;

      const haystack = [
        `job ${w.jobNumber}`,
        w.description,
        w.status,
        c?.name,
        c?.phone,
        c?.address,
        w.locationAddress,
        t?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(qq);
    });
  }, [q, workOrders, customersById, techsById]);

  const recordCount = filtered.length;

  return (
    <div className="ui-page">
      {/* Header row like screenshot */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Customers &gt; Jobs</div>
          <h1 className="ui-title mt-1">Jobs</h1>
          <div className="text-sm text-gray-600 mt-1">
            {loading ? "Loading…" : `${recordCount} records`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="ui-btn ui-btn-primary" onClick={() => router.push("/customers?createJob=1")}>
            Create job
          </button>
          <button className="ui-btn" onClick={() => alert("Actions coming soon")}>
            Actions ▾
          </button>
        </div>
      </div>

      {/* Search + controls row */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            className="ui-input"
            placeholder="Search jobs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <button className="ui-btn" onClick={() => alert("Filter coming soon")}>
          Filter
        </button>
        <button className="ui-btn" onClick={() => alert("Edit columns coming soon")}>
          Edit columns
        </button>
      </div>

      {/* Table */}
      <div className="mt-4 ui-card p-0 overflow-auto">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="sticky top-0 bg-white border-b">
            <tr className="text-left text-gray-600">
              <th className="p-3 w-10">
                <input type="checkbox" />
              </th>
              <th className="p-3 w-24">Job #</th>
              <th className="p-3 min-w-[260px]">Job description</th>
              <th className="p-3 w-160">Job status</th>
              <th className="p-3 min-w-[200px]">Customer name</th>
              <th className="p-3 min-w-[220px]">Address</th>
              <th className="p-3 min-w-[170px]">Job created date</th>
              <th className="p-3 min-w-[210px]">Job scheduled start date</th>
              <th className="p-3 min-w-[200px]">Assigned employees</th>
              <th className="p-3 min-w-[130px] text-right">Job amount</th>
              <th className="p-3 min-w-[130px] text-right">Due amount</th>
            </tr>
          </thead>

          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="p-6 text-gray-500" colSpan={11}>
                  No jobs found.
                </td>
              </tr>
            )}

            {filtered.map((w) => {
              const c = customersById[w.customerId];
              const t = w.assignedTechId ? techsById[w.assignedTechId] : null;

              return (
                <tr
                  key={w.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/jobs/${w.id}`)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" />
                  </td>

                  <td className="p-3 font-medium">{w.jobNumber}</td>

                  <td className="p-3">
                    <div className="font-medium text-gray-900">{w.description || "(No description)"}</div>
                  </td>

                  <td className="p-3">{statusPill(getDisplayStatus(w))}</td>

                  <td className="p-3">{c?.name ?? w.customerName ?? "Unknown"}</td>

                  <td className="p-3">
                    <div className="whitespace-pre-line">
                      {(w.locationAddress || c?.address || "").replace(/,\s*/g, "\n")}
                    </div>
                  </td>

                  <td className="p-3">{fmtDateTime(w.createdAt)}</td>

                  <td className="p-3">
                    {w.assignedStartAt ? fmtDateTime(w.assignedStartAt) : ""}
                  </td>

                  <td className="p-3">
                    {t?.name ? (
                      <span>{t.name}</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                        Unassigned
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    {typeof w.jobAmount === "number" ? `$${w.jobAmount.toFixed(2)}` : "$0.00"}
                  </td>

                  <td className="p-3 text-right">
                    {typeof w.dueAmount === "number" ? `$${w.dueAmount.toFixed(2)}` : "$0.00"}
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr>
                <td className="p-6 text-gray-500" colSpan={11}>
                  Loading jobs…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="ui-page">Loading…</div>}>
      <JobsPageContent />
    </Suspense>
  );
}