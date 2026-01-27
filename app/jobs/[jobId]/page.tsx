"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LineItemsCard from "@/app/components/LineItemsCard";

const TAX_RATE = 0.05;

function money(n: unknown) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
}

type Job = {
  id: string;
  jobNumber?: number;
  customerName?: string;
  description?: string;
  status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  createdAt?: string;
  completedAt?: string | null;

  // depending on your API shape
  customerId?: string;
  locationAddress?: string;
  assignedTechId?: string | null;
  assignedStartAt?: string | null;
  assignedEndAt?: string | null;
  lineItems?: Array<{
    id: string;
    type: string;
    description: string;
    qty: number;
    unitPrice: number;
    taxable: boolean;
  }>;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function JobDetailsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/work-orders/${jobId}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      const data = (await res.json()) as Job;
      setJob(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load job");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/work-orders/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", completedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update job");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (loading) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">
          <div className="font-medium">Job not found</div>
          {error && <div className="text-sm text-gray-600 mt-2">{error}</div>}
          <button className="ui-btn mt-4" onClick={() => router.push("/jobs")}>
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-2">
          <h1 className="ui-title">
            Job {job.jobNumber ? `#${job.jobNumber}` : ""} {job.customerName ? `— ${job.customerName}` : ""}
          </h1>
          <p className="ui-subtitle">{job.status || "Unknown status"}</p>
        </div>

        <div className="flex gap-2">
          <button className="ui-btn" onClick={() => router.push("/jobs")}>
            Back
          </button>
          {job.status !== "COMPLETED" && (
            <button className="ui-btn ui-btn-primary" disabled={saving} onClick={markComplete}>
              {saving ? "Saving..." : "Mark Complete"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 ui-card ui-card-pad">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* Service Address and Summary */}
        <div className="ui-card ui-card-pad">
          <div className="ui-item p-4 mb-5">
            <div className="text-xs text-gray-500">Service address</div>
            <div className="text-sm font-medium text-gray-900 mt-1">{job.locationAddress || "—"}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-2">Summary of work</div>
            <div className="ui-item p-3">{job.description || "—"}</div>
          </div>
        </div>

        {/* Line Items Card */}
        {job.lineItems && job.lineItems.length > 0 && (
          <LineItemsCard
            items={job.lineItems}
            taxRate={TAX_RATE}
            readOnly={true}
            moneyFormatter={money}
          />
        )}
      </div>
    </div>
  );
}
