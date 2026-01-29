"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

type Technician = { id: string; name: string; status: "Available" | "Busy" };

type WorkOrderLineItem = {
  id: string;
  type: string;
  description: string;
  details?: string;
  qty: number;
};

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
  lineItems?: WorkOrderLineItem[];
};

type Customer = { id: string; name: string; phone: string; address: string };

type DispatchEvent = {
  id: string;
  workOrderId?: string | null;
  techId: string;
  startAt: string;
  endAt: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETE" | "CANCELED";
  type?: "JOB" | "TASK" | "MEETING";
  notes?: string;
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diffToMonday = (day + 6) % 7;
  x.setDate(x.getDate() - diffToMonday);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDow(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}
function fmtMD(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function streetAndCity(addr?: string | null) {
  if (!addr) return "";

  // Normalize newlines
  const line = addr
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean) ?? "";

  // Handle common formats:
  // "954 13th St S, Lethbridge, AB T1K..."
  // "954 13th St S — Lethbridge"
  // "954 13th St S - Lethbridge"

  if (line.includes(",")) {
    const parts = line.split(",").map((p) => p.trim());
    return parts.slice(0, 2).join(", "); // street + city
  }

  if (line.includes("—")) {
    const parts = line.split("—").map((p) => p.trim());
    return parts.slice(0, 2).join(" — ");
  }

  if (line.includes(" - ")) {
    const parts = line.split(" - ").map((p) => p.trim());
    return parts.slice(0, 2).join(" - ");
  }

  return line;
}
function fmtPhone(raw?: string | null) {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length !== 10) return raw ?? "—";
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// ids
function makeCellId(techId: string, ymd: string) {
  return `cell|${techId}|${ymd}`;
}
function parseCellId(id: string) {
  const [kind, techId, ymd] = id.split("|");
  if (kind !== "cell" || !techId || !ymd) return null;
  return { techId, ymd };
}
function woDragId(workOrderId: string) {
  return `wo|${workOrderId}`;
}
function evDragId(eventId: string) {
  return `ev|${eventId}`;
}
function parseDragId(id: string) {
  const [kind, realId] = id.split("|");
  if (!kind || !realId) return null;
  if (kind === "wo") return { kind: "wo" as const, id: realId };
  if (kind === "ev") return { kind: "ev" as const, id: realId };
  return null;
}

function buildIsoForYmdTime(ymd: string, hhmm: string) {
  // local time
  const [hh, mm] = hhmm.split(":").map((x) => Number(x));
  const d = new Date(ymd + "T00:00:00");
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function addMinutesIso(startIso: string, minutes: number) {
  const t = new Date(startIso).getTime();
  return new Date(t + minutes * 60_000).toISOString();
}

function durationMinutes(startIso: string, endIso: string) {
  const a = Date.parse(startIso);
  const b = Date.parse(endIso);
  return Math.max(0, Math.round((b - a) / 60000));
}

function timeOptions() {
  // 7:00 to 18:00 every 30 minutes
  const opts: string[] = [];
  for (let h = 7; h <= 18; h++) {
    opts.push(`${pad(h)}:00`);
    if (h !== 18) opts.push(`${pad(h)}:30`);
  }
  return opts;
}

type PendingDrop =
  | {
      mode: "create";
      workOrderId: string;
      techId: string;
      ymd: string;
    }
  | {
      mode: "move";
      eventId: string;
      techId: string;
      ymd: string;
    };

export default function DispatchPage() {
  const router = useRouter();
  const [techs, setTechs] = useState<Technician[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [events, setEvents] = useState<DispatchEvent[]>([]);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // click-select toggles (still useful)
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>("");

  // modal
  const [pending, setPending] = useState<PendingDrop | null>(null);
  const [modalStartTime, setModalStartTime] = useState<string>("08:00");
  const [modalDuration, setModalDuration] = useState<number>(120);

  // event menu (for unassign)
  const [menuEvent, setMenuEvent] = useState<null | {
    id: string;
    workOrderId: string;
    techId: string;
    startAt: string;
    endAt: string;
  }>(null);

  const customersById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );

  const techsById = useMemo(
    () => Object.fromEntries(techs.map((t) => [t.id, t])),
    [techs]
  );

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${fmtMD(weekStart)} – ${fmtMD(end)}`;
  }, [weekStart]);

  const menuDetails = useMemo(() => {
    if (!menuEvent) return null;

    const ev = events.find((x) => x.id === menuEvent.id);
    const wo = workOrders.find((x) => x.id === menuEvent.workOrderId);
    const cust = wo ? customersById[wo.customerId] : null;
    const tech = techsById[menuEvent.techId];

    return { ev, wo, cust, tech };
  }, [menuEvent, events, workOrders, customersById, techsById]);

  async function refresh() {
    setLoading(true);
    try {
      const week = toYMD(weekStart);
      const [t, c, w, e] = await Promise.all([
        fetch("/api/techs", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/customers", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/work-orders", { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/dispatch-events?week=${week}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setTechs(t);
      setCustomers(c);
      setWorkOrders(w);
      setEvents(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const assignedWorkOrderIds = useMemo(
    () => new Set(workOrders.filter((w) => w.assignedTechId).map((w) => w.id)),
    [workOrders]
  );

  const unscheduled = useMemo(() => {
    return workOrders
      .filter((w) => w.status !== "COMPLETED" && w.status !== "CANCELED")
      .filter((w) => !assignedWorkOrderIds.has(w.id));
  }, [workOrders, assignedWorkOrderIds]);

  function eventsForCell(techId: string, day: Date) {
    return events
      .filter((e) => e.techId === techId)
      .filter((e) => sameDay(new Date(e.startAt), day))
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  }

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function openCreateModal(workOrderId: string, techId: string, ymd: string) {
    // default values
    setModalStartTime("08:00");
    setModalDuration(120);
    setPending({ mode: "create", workOrderId, techId, ymd });
  }

  function openMoveModal(eventId: string, techId: string, ymd: string) {
    const ev = events.find((x) => x.id === eventId);
    if (ev) {
      // keep existing time + duration as defaults
      const d = new Date(ev.startAt);
      setModalStartTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      setModalDuration(durationMinutes(ev.startAt, ev.endAt) || 120);
    } else {
      setModalStartTime("08:00");
      setModalDuration(120);
    }
    setPending({ mode: "move", eventId, techId, ymd });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;

    const drag = parseDragId(String(active.id));
    const drop = parseCellId(String(over.id));
    if (!drag || !drop) return;

    if (drag.kind === "wo") {
      // prevent if already assigned anywhere
      if (assignedWorkOrderIds.has(drag.id)) return;
      openCreateModal(drag.id, drop.techId, drop.ymd);
      return;
    }

    if (drag.kind === "ev") {
      openMoveModal(drag.id, drop.techId, drop.ymd);
      return;
    }
  }

  async function confirmModal() {
    if (!pending) return;
    setSaving(true);
    try {
      const startAt = buildIsoForYmdTime(pending.ymd, modalStartTime);
      const endAt = addMinutesIso(startAt, modalDuration);

      if (pending.mode === "create") {
        const res = await fetch("/api/dispatch-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workOrderId: pending.workOrderId,
            techId: pending.techId,
            startAt,
            endAt,
            status: "SCHEDULED",
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          alert(`POST failed: ${res.status}\n${text}`);
          return;
        }

        setSelectedWorkOrderId("");
      } else {
        const res = await fetch(`/api/dispatch-events/${pending.eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            techId: pending.techId,
            startAt,
            endAt,
            status: "SCHEDULED",
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          alert(`PATCH failed: ${res.status}\n${text}`);
          return;
        }
      }

      setPending(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function cancelModal() {
    setPending(null);
  }

  return (
    <div className="ui-page">
      <div className="space-y-2">
        <h1 className="ui-title">Dispatch</h1>
        <p className="ui-subtitle">Drag jobs onto the grid. Drag scheduled blocks to move them.</p>
      </div>

      {/* Week controls */}
      <div className="ui-card ui-card-pad flex items-center justify-between gap-3">
        <div className="font-medium">Week</div>

        <div className="flex items-center gap-2">
          <button className="ui-btn ui-btn-primary" type="button" onClick={() => setWeekStart((d) => addDays(d, -7))}>
            ← Prev
          </button>

          <div className="px-3 py-2 rounded-lg border border-black/10 bg-white text-black">{weekLabel}</div>

          <button className="ui-btn ui-btn-primary" type="button" onClick={() => setWeekStart((d) => addDays(d, 7))}>
            Next →
          </button>

          <button className="ui-btn ui-btn-primary" type="button" onClick={() => setWeekStart(startOfWeekMonday(new Date()))}>
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ui-card ui-card-pad">Loading…</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid lg:grid-cols-[360px_1fr] gap-4">
            {/* Left: Unscheduled */}
            <div className="ui-card ui-card-pad">
              <div className="flex items-center justify-between">
                <div className="font-medium">Unscheduled</div>
                <div className="text-xs text-gray-500">{unscheduled.length}</div>
              </div>

              <div className="ui-muted mt-1">Click a job to select/deselect. Or drag it onto the grid.</div>

              <div className="space-y-2 mt-3">
                {unscheduled.map((w) => {
                  const customerName = customersById[w.customerId]?.name ?? "Unknown";
                  const selected = w.id === selectedWorkOrderId;

                  return (
                    <WorkOrderCard
                      key={w.id}
                      dragId={woDragId(w.id)}
                      workOrder={w}
                      customerName={customerName}
                      location={w.locationAddress}
                      selected={selected}
                      onToggleSelect={() => setSelectedWorkOrderId((curr) => (curr === w.id ? "" : w.id))}
                    />
                  );
                })}

                {unscheduled.length === 0 && <div className="ui-muted">No unscheduled work orders for this week.</div>}
              </div>
            </div>

            {/* Right: Weekly grid */}
            <div className="ui-card ui-card-pad overflow-auto">
              <div className="font-medium mb-3">Dispatch Grid</div>

              <div className="grid grid-cols-[220px_repeat(7,minmax(160px,1fr))] gap-2">
                <div className="text-sm font-medium text-gray-600">Tech</div>
                {days.map((d) => (
                  <div key={toYMD(d)} className="text-sm font-medium text-gray-600">
                    {fmtDow(d)} <span className="text-gray-400">{fmtMD(d)}</span>
                  </div>
                ))}

                {techs.map((t) => (
                  <React.Fragment key={t.id}>
                    <div className="ui-item bg-white">
                      <div className="font-medium">{t.name}</div>
                      {/*<div className="text-xs text-gray-500">{t.status}</div>*/}
                    </div>

                    {days.map((d) => {
                      const ymd = toYMD(d);
                      const cellId = makeCellId(t.id, ymd);
                      const cellEvents = eventsForCell(t.id, d);

                      return (
                        <DispatchCell
                          key={cellId}
                          id={cellId}
                          isSelecting={!!selectedWorkOrderId}
                          onClickAssign={() => {
                            if (!selectedWorkOrderId) return;
                            if (assignedWorkOrderIds.has(selectedWorkOrderId)) return;
                            openCreateModal(selectedWorkOrderId, t.id, ymd);
                          }}
                        >
                          <div className="space-y-2 mt-2">
                            {cellEvents.map((ev) => {
                              const w = workOrders.find((x) => x.id === ev.workOrderId);
                              const c = w ? customersById[w.customerId] : null;

                              return (
                                <EventBlock
                                  key={ev.id}
                                  dragId={evDragId(ev.id)}
                                  timeLabel={`${fmtTime(ev.startAt)} – ${fmtTime(ev.endAt)}`}
                                  title={w?.description ?? "Job"}
                                  subtitle={c?.name ?? "Unknown"}
                                  location={w?.locationAddress}
                                  status={ev.status}
                                  onOpen={() => {
                                    setMenuEvent({
                                      id: ev.id,
                                      workOrderId: ev.workOrderId,
                                      techId: ev.techId,
                                      startAt: ev.startAt,
                                      endAt: ev.endAt,
                                    });
                                  }}
                                />
                              );
                            })}

                            {cellEvents.length === 0 && (
                              <div className="text-xs text-gray-400">
                                {selectedWorkOrderId ? "Click Assign or drag a job here" : "Drop here"}
                              </div>
                            )}
                          </div>
                        </DispatchCell>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Modal */}
          {pending && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="ui-card ui-card-pad w-full max-w-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-lg">
                      {pending.mode === "create" ? "Schedule Work Order" : "Move Scheduled Job"}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {pending.ymd} • Tech:{" "}
                      <span className="font-medium">
                        {techs.find((t) => t.id === pending.techId)?.name ?? pending.techId}
                      </span>
                    </div>
                  </div>

                  <button type="button" className="ui-btn ui-btn-primary" onClick={cancelModal} disabled={saving}>
                    Close
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Start Time</div>
                    <select className="ui-select" value={modalStartTime} onChange={(e) => setModalStartTime(e.target.value)}>
                      {timeOptions().map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium">Duration</div>
                    <select
                      className="ui-select"
                      value={modalDuration}
                      onChange={(e) => setModalDuration(Number(e.target.value))}
                    >
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                      <option value={180}>180 min</option>
                      <option value={240}>240 min</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                  <button type="button" className="ui-btn ui-btn-secondary" onClick={cancelModal} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={confirmModal} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DndContext>
      )}

      {/* Event Details Modal */}
      {menuEvent && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setMenuEvent(null)}
        >
          <div className="ui-card ui-card-pad w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">
                  {menuDetails?.wo?.description ?? "Scheduled Item"}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {menuDetails?.cust?.name ?? "Unknown Customer"}
                </div>
              </div>

              <button className="ui-btn ui-btn-primary" onClick={() => setMenuEvent(null)}>
                Close
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-5">
              {/* Left: Basic info */}
              <div className="space-y-3">
                <div className="rounded-lg border border-black/10 p-3">
                  <div className="text-xs text-gray-500">Scheduled</div>
                  <div className="font-medium">
                    {new Date(menuEvent.startAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" — "}
                    {new Date(menuEvent.endAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <div className="text-xs text-gray-500 mt-2">Tech</div>
                  <div className="font-medium">{menuDetails?.tech?.name ?? menuEvent.techId}</div>

                  <div className="text-xs text-gray-500 mt-2">Address</div>
                  <div className="font-medium">
                    {streetAndCity(menuDetails?.wo?.locationAddress ?? "") || "—"}
                  </div>

                  <div className="text-xs text-gray-500 mt-2">Phone</div>
                  <div className="font-medium">{fmtPhone(menuDetails?.cust?.phone)}</div>

                  <div className="text-xs text-gray-500 mt-2">Status</div>
                  <div className="font-medium">{menuDetails?.ev?.status ?? "SCHEDULED"}</div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  {/* View Job */}
                  {menuDetails?.wo?.id && (
                    <button
                      className="col-span-2 ui-btn ui-btn-primary"
                      onClick={() => {
                        router.push(`/jobs/${menuDetails.wo.id}`);
                      }}
                    >
                      View Job
                    </button>
                  )}

                  {/* Start / Complete */}
                  <button
                    className="ui-btn ui-btn-secondary"
                    onClick={async () => {
                      const res = await fetch(`/api/dispatch-events/${menuEvent.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "IN_PROGRESS" }),
                      });
                      if (!res.ok) {
                        const txt = await res.text().catch(() => "");
                        alert(`Failed: ${res.status}\n${txt}`);
                        return;
                      }
                      await refresh();
                      setMenuEvent(null);
                    }}
                  >
                    Start
                  </button>

                  <button
                    className="ui-btn ui-btn-secondary"
                    onClick={async () => {
                      const res = await fetch(`/api/dispatch-events/${menuEvent.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "COMPLETE" }),
                      });
                      if (!res.ok) {
                        const txt = await res.text().catch(() => "");
                        alert(`Failed: ${res.status}\n${txt}`);
                        return;
                      }
                      await refresh();
                      setMenuEvent(null);
                    }}
                  >
                    Complete
                  </button>

                  {/* Unassign */}
                  <button
                    className="col-span-2 w-full rounded bg-red-600 text-white py-2 hover:bg-red-700 transition"
                    onClick={async () => {
                      const res = await fetch(`/api/dispatch-events/${menuEvent.id}`, { method: "DELETE" });
                      if (!res.ok) {
                        const txt = await res.text().catch(() => "");
                        alert(`Failed to unassign: ${res.status}\n${txt}`);
                        return;
                      }
                      await refresh();
                      setMenuEvent(null);
                    }}
                  >
                    Unassign
                  </button>
                </div>
              </div>

              {/* Right: Work to be done (services) */}
              <div className="rounded-lg border border-black/10 p-3">
                <div className="font-semibold mb-2">Work to be done</div>

                {(() => {
                  const services = menuDetails?.wo?.lineItems?.filter((i) => i.type === "SERVICE") ?? [];
                  return services.length > 0 ? (
                    <ul className="space-y-2">
                      {services.map((s) => (
                        <li key={s.id} className="rounded border border-black/10 p-2 bg-white">
                          <div className="font-medium">
                            {s.description}
                            {s.qty > 1 ? ` × ${s.qty}` : ""}
                          </div>
                          {s.details ? <div className="text-sm text-gray-600 mt-1">{s.details}</div> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-600">No services listed yet.</div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkOrderCard({
  dragId,
  workOrder,
  customerName,
  location,
  selected,
  onToggleSelect,
}: {
  dragId: string;
  workOrder: WorkOrder;
  customerName: string;
  location?: string;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId });

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ui-item w-full text-left cursor-grab select-none ${
        selected ? "border-brand-blue ring-2 ring-brand-blue" : ""
      } ${isDragging ? "opacity-60" : ""}`}
      onClick={onToggleSelect}
      {...listeners}
      {...attributes}
    >
      <div className="font-medium text-sm">
        {workOrder.description || "Job"} — {customerName}
      </div>
      <div className="ui-muted">{workOrder.description}</div>
      {location && (
        <div className="text-xs text-gray-500 mt-1 whitespace-normal break-words">
          {streetAndCity(location)}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-2">{selected ? "Selected (click to deselect)" : "Drag or click"}</div>
    </div>
  );
}

function DispatchCell({
  id,
  isSelecting,
  onClickAssign,
  children,
}: {
  id: string;
  isSelecting: boolean;
  onClickAssign: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`ui-item bg-white min-h-[120px] transition ${isOver ? "ring-2 ring-brand-blue" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{isSelecting ? "Click Assign or drop" : ""}</div>
        {isSelecting && (
          <button type="button" className="text-xs underline" onClick={onClickAssign}>
            Assign
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EventBlock({
  dragId,
  timeLabel,
  title,
  subtitle,
  location,
  status,
  onOpen,
}: {
  dragId: string;
  timeLabel: string;
  title: string;
  subtitle: string;
  location?: string;
  status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETE" | "CANCELED";
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId });
  const isCompleted = status === "COMPLETE";

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-2 cursor-grab select-none transition ${
        isCompleted
          ? "border-gray-300 bg-gray-100 text-gray-400 opacity-70"
          : "border-black/10 bg-gray-50"
      } ${isDragging ? "opacity-60" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      {...listeners}
      {...attributes}
    >
      <div className={`text-xs ${isCompleted ? "text-gray-500" : "text-gray-500"}`}>{timeLabel}</div>
      <div className={`font-medium text-sm ${isCompleted ? "line-through" : ""}`}>{title}</div>
      <div className={`text-xs truncate ${isCompleted ? "text-gray-500" : "text-gray-600"}`}>{subtitle}</div>
      {location && (
        <div
          className={`text-xs mt-0.5 whitespace-normal break-words ${
            isCompleted ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {streetAndCity(location)}
        </div>
      )}
    </div>
  );
}
