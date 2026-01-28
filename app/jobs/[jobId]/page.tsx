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

  customer?: { name?: string; phone?: string; email?: string };
  location?: { address?: string; name?: string };

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
  const [draftDescription, setDraftDescription] = useState("");
  const [newType, setNewType] = useState("SERVICE");
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState(0);
  const [newTaxable, setNewTaxable] = useState(true);

  // Pricebook picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<"SERVICE" | "MATERIAL">("SERVICE");
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/work-orders/${jobId}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      const data = (await res.json()) as Job;
      setJob(data);
      setDraftDescription(data.description ?? "");
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

  async function saveDetails() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/work-orders/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: draftDescription }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save job details");
    } finally {
      setSaving(false);
    }
  }

  async function addLineItem() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/work-orders/${jobId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          description: newDesc,
          qty: newQty,
          unitPrice: Math.round(newUnit * 100),
          taxable: newTaxable,
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      setNewDesc("");
      setNewQty(1);
      setNewUnit(0);
      setNewTaxable(true);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to add line item");
    } finally {
      setSaving(false);
    }
  }

  async function searchPricebook(q: string, kind: "SERVICE" | "MATERIAL") {
    setPickerLoading(true);
    try {
      const res = await fetch(
        `/api/pricebook/search?q=${encodeURIComponent(q)}&tier=STANDARD&limit=200`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const items = data.items ?? data ?? [];
      const filtered = items.filter((it: any) => {
        const t = String(it.type ?? it.kind ?? "").toUpperCase();
        if (kind === "SERVICE") return t !== "MATERIAL";
        if (kind === "MATERIAL") return t === "MATERIAL";
        return true;
      });
      setPickerResults(filtered);
    } finally {
      setPickerLoading(false);
    }
  }

  function openPicker(kind: "SERVICE" | "MATERIAL") {
    setPickerKind(kind);
    setPickerQuery("");
    setPickerOpen(true);
  }

  async function addFromPricebook(item: any) {
    setSaving(true);
    setError("");
    try {
      const rates = item.rates ?? {};
      const defaultTier =
        rates.STANDARD != null
          ? "STANDARD"
          : rates.MEMBER != null
          ? "MEMBER"
          : rates.RUMI != null
          ? "RUMI"
          : "STANDARD";

      const unitDollars = Number(rates[defaultTier] ?? item.unitPrice ?? 0);
      const unitCents = Math.round(unitDollars * 100);

      const res = await fetch(`/api/work-orders/${jobId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: pickerKind,
          description: item.name,
          qty: 1,
          unitPrice: unitCents,
          taxable: item.taxableDefault ?? true,
          priceBookItemId: item.id ?? null,
          rateTier: defaultTier ?? null,
        }),
      });

      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);

      setPickerOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to add from pricebook");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (!pickerOpen) return;
    searchPricebook("", pickerKind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen, pickerKind]);

  useEffect(() => {
    if (!pickerOpen) return;
    const t = setTimeout(() => {
      searchPricebook(pickerQuery.trim(), pickerKind);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerQuery, pickerOpen, pickerKind]);

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

  const canEdit = job.status !== "COMPLETED" && job.status !== "CANCELED";

  const customerLabel = job.customerName ?? job.customer?.name ?? "";
  const addressLabel = job.locationAddress ?? job.location?.address ?? job.location?.name ?? "";

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-2">
          <h1 className="ui-title">
            Job {job.jobNumber ? `#${job.jobNumber}` : ""} {customerLabel ? `— ${customerLabel}` : ""}
          </h1>
          <p className="ui-subtitle">
            {job.status || "Unknown status"}
            {canEdit ? " • Editable" : " • Locked"}
          </p>
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
            <div className="text-sm font-medium text-gray-900 mt-1">{addressLabel || "—"}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Summary of work</div>
              {canEdit && (
                <button className="ui-btn ui-btn-primary" disabled={saving} onClick={saveDetails}>
                  {saving ? "Saving..." : "Save"}
                </button>
              )}
            </div>

            {canEdit ? (
              <textarea
                className="ui-input w-full min-h-[120px]"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="What needs to be done?"
                disabled={saving}
              />
            ) : (
              <div className="ui-item p-3">{job.description || "—"}</div>
            )}
          </div>
        </div>

        {/* Line Items Card */}
        <LineItemsCard
          items={job.lineItems ?? []}
          taxRate={TAX_RATE}
          readOnly={!canEdit}
          disabled={!canEdit || saving}
          moneyFormatter={money}
          descriptionField="description"
          typeField="type"
          qtyField="qty"
          unitPriceField="unitPrice"
          taxableField="taxable"
          onRemove={canEdit ? async (itemId: string) => {
            setSaving(true);
            setError("");
            try {
              const res = await fetch(`/api/work-orders/${jobId}/items/${itemId}`, { method: "DELETE" });
              if (!res.ok) throw new Error(await res.text());
              await load();
            } catch (e: any) {
              setError(e?.message || "Failed to remove line item");
            } finally {
              setSaving(false);
            }
          } : undefined}
        />

        {canEdit && (
          <div className="ui-card ui-card-pad">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Add items</div>
                <div className="text-xs text-gray-500 mt-1">Pick from the pricebook.</div>
              </div>

              <div className="flex gap-2">
                <button className="ui-btn ui-btn-primary" type="button" onClick={() => openPicker("SERVICE")} disabled={saving}>
                  + Service
                </button>
                <button className="ui-btn ui-btn-primary" type="button" onClick={() => openPicker("MATERIAL")} disabled={saving}>
                  + Material
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pricebook Picker Modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">
                  Add {pickerKind === "SERVICE" ? "Service" : "Material"}
                </h2>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <input
                type="text"
                className="ui-input w-full"
                placeholder={`Search ${pickerKind === "SERVICE" ? "services" : "materials"}...`}
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {pickerLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {!pickerResults.length ? (
                    <div className="text-sm text-gray-500">No results found.</div>
                  ) : (
                    pickerResults.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 border rounded hover:bg-blue-50 cursor-pointer"
                        onClick={() => addFromPricebook(item)}
                      >
                        <div className="font-medium text-sm">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                        )}
                        <div className="text-sm font-semibold text-gray-800 mt-1">
                          ${money(item.unitPrice)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
