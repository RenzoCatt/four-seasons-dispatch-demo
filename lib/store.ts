// Simple in-memory store for prototype use only.
// This resets whenever you restart the dev server.

export type TechStatus = "Available" | "Busy";
export type WorkOrderStatus = "New" | "Assigned" | "Complete";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
};

export type Technician = {
  id: string;
  name: string;
  status: TechStatus;
};

export type WorkOrderAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type WorkOrder = {
  id: string;
  customerId: string;

  // Link to service location (optional in prototype)
  locationId?: string;

  jobType: "Service" | "Install";
  description: string;
  status: WorkOrderStatus;
  assignedTechId?: string;

  // Attachments metadata (prototype)
  attachments?: WorkOrderAttachment[];

  createdAt: string; // ISO
};

// -----------------------------
// Dispatch Events (Visits)
// -----------------------------

export type DispatchEventStatus = "Scheduled" | "InProgress" | "Complete" | "Canceled";

export type DispatchEvent = {
  id: string;
  workOrderId: string;
  techId: string;
  startAt: string; // ISO datetime
  endAt: string; // ISO datetime
  status: DispatchEventStatus;
  notes?: string;
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function isValidIso(d: string) {
  return !Number.isNaN(Date.parse(d));
}

function addMinutes(iso: string, minutes: number) {
  const t = new Date(iso).getTime();
  return new Date(t + minutes * 60_000).toISOString();
}

const seedCustomers: Customer[] = [
  {
    id: "c_1",
    name: "Sarah Thompson",
    phone: "403-555-0111",
    address: "12 Ridgewood Dr, Lethbridge",
    notes: "Prefers afternoon calls",
  },
  { id: "c_2", name: "Mike Reynolds", phone: "403-555-0222", address: "954 13th St S, Lethbridge" },
];

const seedTechs: Technician[] = [
  { id: "t_1", name: "Jordan", status: "Available" },
  { id: "t_2", name: "Avery", status: "Busy" },
];

const seedWorkOrders: WorkOrder[] = [
  {
    id: "w_1",
    customerId: "c_2",
    jobType: "Service",
    description: "Furnace making noise",
    status: "Assigned",
    assignedTechId: "t_2",
    createdAt: new Date().toISOString(),
  },
];

// Optional seed dispatch events (leave empty for now)
const seedDispatchEvents: DispatchEvent[] = [
  // Example:
  // {
  //   id: "e_1",
  //   workOrderId: "w_1",
  //   techId: "t_2",
  //   startAt: new Date().toISOString(),
  //   endAt: addMinutes(new Date().toISOString(), 120),
  //   status: "Scheduled",
  // },
];

export const store = {
  customers: [...seedCustomers],
  techs: [...seedTechs],
  workOrders: [...seedWorkOrders],

  // NEW: dispatch events store
  dispatchEvents: [...seedDispatchEvents],

  // -----------------------------
  // Customers
  // -----------------------------
  addCustomer(data: Omit<Customer, "id">) {
    const c: Customer = { ...data, id: id("c") };
    this.customers.unshift(c);
    return c;
  },

  findCustomerByPhone(phone: string) {
    const p = phone.replace(/\D/g, "");
    return this.customers.find((c) => c.phone.replace(/\D/g, "") === p);
  },

  // -----------------------------
  // Work orders
  // -----------------------------
  addWorkOrder(data: Omit<WorkOrder, "id" | "createdAt">) {
    const w: WorkOrder = { ...data, id: id("w"), createdAt: new Date().toISOString() };
    this.workOrders.unshift(w);
    return w;
  },

  updateWorkOrder(id: string, patch: Partial<WorkOrder>) {
    const idx = this.workOrders.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    this.workOrders[idx] = { ...this.workOrders[idx], ...patch };
    return this.workOrders[idx];
  },

  // -----------------------------
  // Dispatch Events (NEW)
  // -----------------------------
  addDispatchEvent(data: Omit<DispatchEvent, "id">) {
    // validate refs
    if (!this.workOrders.find((w) => w.id === data.workOrderId)) {
      throw new Error("Work order not found");
    }
    if (!this.techs.find((t) => t.id === data.techId)) {
      throw new Error("Tech not found");
    }
    if (!isValidIso(data.startAt) || !isValidIso(data.endAt)) {
      throw new Error("Invalid startAt/endAt");
    }

    const e: DispatchEvent = { ...data, id: id("e") };
    this.dispatchEvents.unshift(e);

    // keep existing board logic in sync
    this.updateWorkOrder(data.workOrderId, {
      status: "Assigned",
      assignedTechId: data.techId,
    });

    return e;
  },

  updateDispatchEvent(eventId: string, patch: Partial<DispatchEvent>) {
    const idx = this.dispatchEvents.findIndex((e) => e.id === eventId);
    if (idx === -1) return null;

    const next: DispatchEvent = { ...this.dispatchEvents[idx], ...patch };

    if (next.startAt && !isValidIso(next.startAt)) throw new Error("Invalid startAt");
    if (next.endAt && !isValidIso(next.endAt)) throw new Error("Invalid endAt");

    this.dispatchEvents[idx] = next;

    // keep work order in sync
    if (patch.techId) {
      this.updateWorkOrder(next.workOrderId, {
        status: "Assigned",
        assignedTechId: patch.techId,
      });
    }

    if (patch.status === "Complete") {
      this.updateWorkOrder(next.workOrderId, { status: "Complete" });
    }

    return this.dispatchEvents[idx];
  },

  listDispatchEventsForWeek(weekIsoDate: string) {
    // weekIsoDate should be YYYY-MM-DD
    const base = new Date(weekIsoDate + "T00:00:00");
    if (Number.isNaN(base.getTime())) throw new Error("Invalid week");

    // Monday-based week start
    const day = base.getDay(); // 0 Sun .. 6 Sat
    const diffToMonday = (day + 6) % 7; // Mon=0, Tue=1, ... Sun=6
    const start = new Date(base);
    start.setDate(base.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const startMs = start.getTime();
    const endMs = end.getTime();

    return this.dispatchEvents.filter((e) => {
      const s = Date.parse(e.startAt);
      return s >= startMs && s < endMs;
    });
  },

  // utility exposed (optional, but handy elsewhere)
  addMinutes,
};
