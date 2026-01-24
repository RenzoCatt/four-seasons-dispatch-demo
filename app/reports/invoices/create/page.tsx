"use client";

import { useEffect, useMemo, useState } from "react";

type ReadyJob = {
  id: string;
  jobNumber: number;
  completedAt: string | null;
  description: string;
  location: string;
  techId: string | null;
};

type ReadyGroup = {
  customerId: string;
  customerName: string;
  jobs: ReadyJob[];
};

export default function CreateInvoicesPage() {
  const [groups, setGroups] = useState<ReadyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports/invoices/ready", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load invoice-ready jobs");
      const data = (await res.json()) as ReadyGroup[];
      setGroups(data);
      // auto-expand first group for convenience
      if (Array.isArray(data) && data.length > 0) {
        setExpanded((prev) => ({ ...prev, [data[0].customerId]: true }));
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const totalJobs = useMemo(
    () => groups.reduce((sum, g) => sum + g.jobs.length, 0),
    [groups]
  );

  async function createInvoice() {
    if (!selectedWorkOrderId) return;

    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/reports/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId: selectedWorkOrderId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Create failed (${res.status})`);
      }

      const invoice = await res.json();

      // refresh list (the job should disappear now)
      setSelectedWorkOrderId(null);
      await refresh();

      alert(`Invoice created (Draft)`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="ui-card ui-card-pad">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ui-title">Create Invoices</h1>
          <p className="ui-subtitle">
            Completed work orders that have not been invoiced yet.
          </p>
        </div>

        <button
          className="ui-btn ui-btn-primary"
          disabled={!selectedWorkOrderId || creating}
          onClick={createInvoice}
        >
          {creating ? "Creating..." : "Create Invoice"}
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        {loading ? "Loading..." : `${totalJobs} job(s) ready to invoice`}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded border border-red-500/20 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && totalJobs === 0 && (
        <div className="mt-10 text-center text-sm text-gray-600">
          No completed work orders. When jobs are marked complete, they'll appear here.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {groups.map((g) => {
          const isOpen = !!expanded[g.customerId];
          return (
            <div key={g.customerId} className="ui-item">
              <button
                className="w-full flex items-center justify-between px-3 py-3 text-left"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [g.customerId]: !isOpen }))
                }
              >
                <div className="font-semibold">{g.customerName}</div>
                <div className="text-xs text-gray-500">
                  {g.jobs.length} job(s)
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/10">
                  {g.jobs.map((j) => {
                    const checked = selectedWorkOrderId === j.id;
                    return (
                      <div
                        key={j.id}
                        onClick={() => setSelectedWorkOrderId(j.id)}
                        className={`flex items-start gap-3 px-3 py-3 border-t border-white/5 cursor-pointer transition ${
                          checked
                            ? "bg-brand-blue/20 border-brand-blue"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={checked}
                          onChange={() => setSelectedWorkOrderId(j.id)}
                          className="mt-1"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm">Job #{j.jobNumber}</div>
                            <div className="text-xs text-gray-500">
                              {j.completedAt
                                ? new Date(j.completedAt).toLocaleDateString()
                                : ""}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400 mt-1 line-clamp-1">
                            {j.description}
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 gap-2">
                            <span className="truncate">{j.location}</span>
                            <span className="font-medium text-white">$0.00</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
