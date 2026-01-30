"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CustomerNav from "../../components/CustomerNav";

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
  createdAt: string;
};

function fmtDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export default function CustomerWorkOrdersPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();
  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState<string>("Customer");
  const pageTitle = "Jobs";

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/work-orders?customerId=${customerId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [customerId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
        if (!res.ok) return;
        const c = await res.json();
        setCustomerName(
          c.displayName ||
          [c.firstName, c.lastName].filter(Boolean).join(" ") ||
          c.name ||
          "Customer"
        );
      } catch {}
    })();
  }, [customerId]);

  if (loading) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="ui-title">{customerName}</h1>
          <div className="text-sm text-gray-600">{pageTitle}</div>
        </div>
      </div>

      <CustomerNav customerId={customerId} />

      {jobs.length === 0 ? (
        <div className="ui-card ui-card-pad">
          <div className="text-sm text-gray-600">No jobs found for this customer.</div>
        </div>
      ) : (
        <div className="ui-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Job #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Assigned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/jobs/${job.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:underline"
                    >
                      #{job.jobNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{job.description || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{job.locationAddress || "—"}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {job.assignedTechId ? (
                      <span>Assigned</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{fmtDate(job.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
