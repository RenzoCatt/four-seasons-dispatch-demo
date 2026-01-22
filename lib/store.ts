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

export type WorkOrder = {
  id: string;
  customerId: string;
  jobType: "Service" | "Install";
  description: string;
  status: WorkOrderStatus;
  assignedTechId?: string;
  createdAt: string; // ISO
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const seedCustomers: Customer[] = [
  { id: "c_1", name: "Sarah Thompson", phone: "403-555-0111", address: "12 Ridgewood Dr, Lethbridge", notes: "Prefers afternoon calls" },
  { id: "c_2", name: "Mike Reynolds", phone: "403-555-0222", address: "954 13th St S, Lethbridge" },
];

const seedTechs: Technician[] = [
  { id: "t_1", name: "Jordan", status: "Available" },
  { id: "t_2", name: "Avery", status: "Busy" },
];

const seedWorkOrders: WorkOrder[] = [
  { id: "w_1", customerId: "c_2", jobType: "Service", description: "Furnace making noise", status: "Assigned", assignedTechId: "t_2", createdAt: new Date().toISOString() },
];

export const store = {
  customers: [...seedCustomers],
  techs: [...seedTechs],
  workOrders: [...seedWorkOrders],

  // Customers
  addCustomer(data: Omit<Customer, "id">) {
    const c: Customer = { ...data, id: id("c") };
    this.customers.unshift(c);
    return c;
  },

  findCustomerByPhone(phone: string) {
    const p = phone.replace(/\D/g, "");
    return this.customers.find(c => c.phone.replace(/\D/g, "") === p);
  },

  // Work orders
  addWorkOrder(data: Omit<WorkOrder, "id" | "createdAt">) {
    const w: WorkOrder = { ...data, id: id("w"), createdAt: new Date().toISOString() };
    this.workOrders.unshift(w);
    return w;
  },

  updateWorkOrder(id: string, patch: Partial<WorkOrder>) {
    const idx = this.workOrders.findIndex(w => w.id === id);
    if (idx === -1) return null;
    this.workOrders[idx] = { ...this.workOrders[idx], ...patch };
    return this.workOrders[idx];
  },
};
