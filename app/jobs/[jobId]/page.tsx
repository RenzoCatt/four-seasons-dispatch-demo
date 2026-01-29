"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const TAX_RATE = 0.05;

function money(n: unknown) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
}

async function safeError(res: Response) {
  const text = await res.text().catch(() => "");
  console.error("API error:", res.status, text);
  return `Request failed (${res.status})`;
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
  assignedTech?: { id: string; name: string } | null;

  customer?: { name?: string; phone?: string; email?: string };
  location?: { address?: string; name?: string };

  lineItems?: Array<{
    id: string;
    type: string;
    description: string;
    details?: string | null;
    qty: number;
    unitPrice: number; // dollars
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

  // Line item drafts (local edits, no auto-save)
  const [lineItemDrafts, setLineItemDrafts] = useState<
    Record<string, { title: string; details: string; qty: string; unitPrice: string; taxable: boolean }>
  >({});

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
      if (!res.ok) throw new Error(await safeError(res));
      const data = (await res.json()) as Job;
      setJob(data);
      setDraftDescription(data.description ?? "");
      
      // Initialize line item drafts from DB fields
      const drafts: typeof lineItemDrafts = {};
      (data.lineItems ?? []).forEach((item) => {
        drafts[item.id] = {
          title: item.description ?? "",
          details: item.details ?? "",
          qty: (Number(item.qty) || 0).toFixed(2),
          unitPrice: (Number(item.unitPrice) || 0).toFixed(2),
          taxable: !!item.taxable,
        };
      });
      setLineItemDrafts(drafts);
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
      if (!res.ok) throw new Error(await safeError(res));
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update job");
    } finally {
      setSaving(false);
    }
  }

  async function saveAllChanges() {
    setSaving(true);
    setError("");
    try {
      // Save work order description
      const resDesc = await fetch(`/api/work-orders/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: draftDescription }),
      });
      if (!resDesc.ok) throw new Error(await safeError(resDesc));

      // Batch-update all line items that have been modified
      const itemsToUpdate = (job?.lineItems ?? [])
        .filter((item) => lineItemDrafts[item.id])
        .map((item) => {
          const draft = lineItemDrafts[item.id];
          return {
            id: item.id,
            description: draft.title || null,
            details: draft.details || null,
            qty: parseFloat(draft.qty) || 0,
            unitPrice: parseFloat(draft.unitPrice) || 0,
            taxable: Boolean(draft.taxable),
          };
        });

      if (itemsToUpdate.length > 0) {
        const resBulk = await fetch(`/api/work-orders/${jobId}/items`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToUpdate }),
        });
        if (!resBulk.ok) throw new Error(await safeError(resBulk));
      }

      // Reload after all saves
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save changes");
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
          unitPrice: newUnit, // dollars (matches Float in DB)
          taxable: newTaxable,
        }),
      });
      if (!res.ok) throw new Error(await safeError(res));
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
      if (!res.ok) throw new Error(await safeError(res));
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

      const res = await fetch(`/api/work-orders/${jobId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: pickerKind,
          description: item.name,
          details: item.description ?? null,
          qty: 1,
          unitPrice: unitDollars, // dollars (matches Float in DB)
          taxable: item.taxableDefault ?? true,
        }),
      });

      if (!res.ok) throw new Error(await safeError(res));

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

  // Helper to handle both type and kind fields
  const itemKind = (x: any): string => String(x.type ?? x.kind ?? "").toUpperCase();

  // Display status (derived, not raw enum)
  const displayStatus = job.completedAt
    ? "Completed"
    : !job.assignedTechId
      ? "Unassigned"
      : job.assignedStartAt
        ? "Scheduled"
        : "New";

  // Totals calculation (dollars, not cents)
  const items = job.lineItems ?? [];
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const taxableTotal = items
    .filter((i) => i.taxable)
    .reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const tax = taxableTotal * TAX_RATE;
  const totalAmount = subtotal + tax;

  return (
    <div className="ui-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-2">
          <h1 className="ui-title">
            Job {job.jobNumber ? `#${job.jobNumber}` : ""} {customerLabel ? `— ${customerLabel}` : ""}
          </h1>
          <p className="ui-subtitle">
            {displayStatus || "Unknown status"}
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

      {/* Two-column layout: Sidebar + Main */}
      <div className="flex gap-6 mt-6">
        {/* LEFT SIDEBAR */}
        <aside className="w-[320px] shrink-0 sticky top-4 self-start space-y-4">
          {/* Customer Card */}
          <div className="ui-card ui-card-pad">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Customer</div>
                <div className="text-sm font-semibold text-gray-900 mt-1">{customerLabel || "—"}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Service Address</div>
                <div className="text-sm text-gray-700 mt-1">{addressLabel || "—"}</div>
              </div>

              {job.customer?.phone && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Phone</div>
                  <a href={`tel:${job.customer.phone}`} className="text-sm text-blue-600 hover:underline mt-1">
                    {job.customer.phone}
                  </a>
                </div>
              )}

              {job.customer?.email && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Email</div>
                  <a href={`mailto:${job.customer.email}`} className="text-sm text-blue-600 hover:underline mt-1">
                    {job.customer.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="ui-card ui-card-pad h-[180px] flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-sm">Map preview</div>
              <div className="text-xs text-gray-500 mt-1">(Coming soon)</div>
            </div>
          </div>

          {/* Job Info Card */}
          <div className="ui-card ui-card-pad">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Job Created</div>
                <div className="text-sm text-gray-700 mt-1">{fmtDate(job.createdAt)}</div>
              </div>

              {job.completedAt && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Completed</div>
                  <div className="text-sm text-gray-700 mt-1">{fmtDate(job.completedAt)}</div>
                </div>
              )}

              {job.assignedStartAt && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Scheduled Start</div>
                  <div className="text-sm text-gray-700 mt-1">{fmtDate(job.assignedStartAt)}</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN COLUMN */}
        <main className="flex-1 space-y-6">
          {/* Action Strip (HCP style) */}
          <div className="ui-card ui-card-pad">
            <div className="flex flex-wrap gap-3">
              <button className="ui-btn" type="button" onClick={() => alert("Add appointment coming soon")}>
                Add appointment
              </button>
              <button className="ui-btn" type="button" onClick={() => alert("OMW coming soon")}>
                OMW
              </button>
              <button className="ui-btn" type="button" onClick={() => alert("Start coming soon")}>
                Start
              </button>
              <button className="ui-btn" type="button" onClick={() => alert("Finish coming soon")}>
                Finish
              </button>
              <button className="ui-btn" type="button" onClick={() => alert("Invoice coming soon")}>
                Invoice
              </button>
              <button className="ui-btn" type="button" onClick={() => alert("Pay coming soon")}>
                Pay
              </button>
            </div>
          </div>

          {/* Summary of Work */}
          <div className="ui-card ui-card-pad">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">Summary of Work</div>
              {canEdit && (
                <button className="ui-btn ui-btn-primary" disabled={saving} onClick={saveAllChanges}>
                  {saving ? "Saving..." : "Save Work Order"}
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

          {/* Appointments */}
          <div className="ui-card ui-card-pad">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Appointments</div>
              <button className="ui-btn ui-btn-primary" type="button" onClick={() => alert("Create appointment coming soon")}>
                + Appointment
              </button>
            </div>

            <div className="mt-3 text-sm text-gray-700">
              {job.assignedStartAt ? (
                <div className="flex items-center justify-between border-t pt-3">
                  <div>
                    <div className="font-medium">{fmtDate(job.assignedStartAt)}</div>
                    {job.assignedEndAt && (
                      <div className="text-xs text-gray-500">Ends: {fmtDate(job.assignedEndAt)}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{job.assignedTechId ? "Assigned" : "Unassigned"}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-2">No appointment scheduled.</div>
              )}
            </div>
          </div>

          {/* Field tech status */}
          <div className="ui-card ui-card-pad">
            <div className="font-semibold mb-4">Field tech status</div>

            <div className="text-sm">
              <div className="grid grid-cols-4 gap-3 text-xs text-gray-500 border-b pb-2">
                <div>Employee name</div>
                <div>Status</div>
                <div>Travel time</div>
                <div>Job time</div>
              </div>

              <div className="grid grid-cols-4 gap-3 py-3 border-b last:border-0">
                <div className="text-gray-800">
                  {job.assignedTech?.name ?? (job.assignedTechId ? "Assigned" : "—")}
                </div>
                <div className="text-gray-700">{job.assignedTechId ? "Assigned" : "Unassigned"}</div>
                <div className="text-gray-500">—</div>
                <div className="text-gray-500">
                  {job.assignedStartAt ? fmtDate(job.assignedStartAt) : "—"}
                  {job.status === "COMPLETED" && job.assignedEndAt && (
                    <div className="text-xs mt-1">End: {fmtDate(job.assignedEndAt)}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line items (HCP style like create screen) */}
          <div className="ui-card ui-card-pad">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Line items</div>

              <div className="flex gap-2">
                <button type="button" className="ui-btn" disabled title="Coming soon">
                  ▦
                </button>
                <button type="button" className="ui-btn" disabled title="Coming soon">
                  ≡
                </button>
              </div>
            </div>

            <div className="mt-4 border-t" />

            {/* Services */}
            <div className="py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-gray-800">Services</div>
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  onClick={() => openPicker("SERVICE")}
                  disabled={!canEdit || saving}
                  title="Add service"
                >
                  +
                </button>
              </div>

              <div
                className="text-sm text-sky-700 mt-2 cursor-pointer"
                onClick={() => openPicker("SERVICE")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" ? openPicker("SERVICE") : null)}
              >
                Add service
              </div>

              {(job.lineItems ?? []).filter((x) => itemKind(x) === "SERVICE").length > 0 && (
                <div className="mt-4 space-y-3">
                  {(job.lineItems ?? [])
                    .filter((x) => itemKind(x) === "SERVICE")
                    .map((item) => (
                      <EditableLineItemCard
                        key={item.id}
                        jobId={jobId}
                        item={item}
                        draft={lineItemDrafts[item.id] || {
                          title: item.description ?? "",
                          details: item.details ?? "",
                          qty: item.qty ?? 1,
                          unitPrice: Number(item.unitPrice ?? 0),
                          taxable: !!item.taxable,
                        }}
                        onDraftChange={(patch) =>
                          setLineItemDrafts((d) => ({
                            ...d,
                            [item.id]: { ...d[item.id], ...patch },
                          }))
                        }
                        disabled={!canEdit || saving}
                        onDelete={async (itemId: string) => {
                          const res = await fetch(`/api/work-orders/${jobId}/items/${itemId}`, {
                            method: "DELETE",
                          });
                          if (!res.ok) throw new Error(await safeError(res));
                          await load();
                        }}
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Materials */}
            <div className="py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-gray-800">Materials</div>
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  onClick={() => openPicker("MATERIAL")}
                  disabled={!canEdit || saving}
                  title="Add material"
                >
                  +
                </button>
              </div>

              <div
                className="text-sm text-sky-700 mt-2 cursor-pointer"
                onClick={() => openPicker("MATERIAL")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" ? openPicker("MATERIAL") : null)}
              >
                Add material
              </div>

              {(job.lineItems ?? []).filter((x) => itemKind(x) === "MATERIAL").length > 0 && (
                <div className="mt-4 space-y-3">
                  {(job.lineItems ?? [])
                    .filter((x) => itemKind(x) === "MATERIAL")
                    .map((item) => (
                      <EditableLineItemCard
                        key={item.id}
                        jobId={jobId}
                        item={item}
                        draft={lineItemDrafts[item.id] || {
                          title: item.description ?? "",
                          details: item.details ?? "",
                          qty: item.qty ?? 1,
                          unitPrice: Number(item.unitPrice ?? 0),
                          taxable: !!item.taxable,
                        }}
                        onDraftChange={(patch) =>
                          setLineItemDrafts((d) => ({
                            ...d,
                            [item.id]: { ...d[item.id], ...patch },
                          }))
                        }
                        disabled={!canEdit || saving}
                        onDelete={async (itemId: string) => {
                          const res = await fetch(`/api/work-orders/${jobId}/items/${itemId}`, {
                            method: "DELETE",
                          });
                          if (!res.ok) throw new Error(await safeError(res));
                          await load();
                        }}
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">Subtotal</div>
                <div className="font-medium">${money(subtotal)}</div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  Tax rate <span className="text-xs text-gray-500 ml-2">GST (5.0%)</span>
                </div>
                <div className="font-medium">${money(tax)}</div>
              </div>

              <div className="border-t pt-3 flex items-center justify-between">
                <div className="text-lg font-semibold">Total</div>
                <div className="text-lg font-semibold">${money(totalAmount)}</div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="ui-card ui-card-pad">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Add Items</div>
                  <div className="text-xs text-gray-500 mt-1">Pick from the pricebook.</div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="ui-btn ui-btn-primary"
                    type="button"
                    onClick={() => openPicker("SERVICE")}
                    disabled={saving}
                  >
                    + Service
                  </button>
                  <button
                    className="ui-btn ui-btn-primary"
                    type="button"
                    onClick={() => openPicker("MATERIAL")}
                    disabled={saving}
                  >
                    + Material
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
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

function EditableLineItemCard({
  jobId,
  item,
  draft,
  onDraftChange,
  disabled,
  onDelete,
}: {
  jobId: string;
  item: { id: string; type: string; description: string; qty: number; unitPrice: number; taxable: boolean };
  draft: { title: string; details: string; qty: string; unitPrice: string; taxable: boolean };
  onDraftChange: (patch: Partial<typeof draft>) => void;
  disabled: boolean;
  onDelete: (itemId: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const totalDollars = (parseFloat(draft.qty) || 0) * (parseFloat(draft.unitPrice) || 0);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(item.id);
    } catch (e: any) {
      setDeleteError(e?.message || "Failed to delete line item");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="border rounded-lg p-3">
      {deleteError && <div className="text-xs text-red-600 mb-2">{deleteError}</div>}

      <div className="grid grid-cols-12 gap-3 items-start">
        <div className="col-span-12 lg:col-span-6 space-y-2">
          <input
            className="ui-input w-full"
            type="text"
            placeholder="Service name or title"
            value={draft.title}
            disabled={disabled || deleting}
            onChange={(e) => onDraftChange({ title: e.target.value })}
          />

          <textarea
            className="ui-input w-full"
            rows={2}
            placeholder="Description (optional)"
            value={draft.details}
            disabled={disabled || deleting}
            onChange={(e) => onDraftChange({ details: e.target.value })}
          />

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.taxable}
              disabled={disabled || deleting}
              onChange={(e) => onDraftChange({ taxable: e.target.checked })}
            />
            Taxable
          </label>
        </div>

        <div className="col-span-6 lg:col-span-2">
          <div className="text-xs text-gray-500 mb-1">Qty</div>
          <input
            className="ui-input w-full"
            type="number"
            min={0}
            step="0.01"
            value={draft.qty}
            disabled={disabled || deleting}
            onChange={(e) => onDraftChange({ qty: e.target.value })}
          />
        </div>

        <div className="col-span-6 lg:col-span-2">
          <div className="text-xs text-gray-500 mb-1">Unit price</div>
          <input
            className="ui-input w-full"
            type="number"
            min={0}
            step="0.01"
            value={draft.unitPrice}
            disabled={disabled || deleting}
            onChange={(e) => onDraftChange({ unitPrice: e.target.value })}
          />
        </div>

        <div className="col-span-8 lg:col-span-1">
          <div className="text-xs text-gray-500 mb-1">Total</div>
          <div className="text-sm font-semibold mt-2">${totalDollars.toFixed(2)}</div>
        </div>

        <div className="col-span-4 lg:col-span-1 flex justify-end">
          <button
            type="button"
            className="ui-btn"
            disabled={disabled || deleting}
            onClick={handleDelete}
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
