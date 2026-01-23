export type WorkOrderStatus = "draft" | "scheduled" | "in_progress" | "complete" | "cancelled";

export type WorkOrder = {
  id: string;
  customerId: string;
  locationId: string;
  title: string;        // “Furnace repair”, “Maintenance”, etc.
  status: WorkOrderStatus;
  scheduledAt?: string; // ISO string
  notes?: string;
  createdAt: string;    // ISO string
};

let nextWorkOrderId = 2;

export const workOrders: WorkOrder[] = [
  {
    id: "wo_1",
    customerId: "c_1",
    locationId: "l_1",
    title: "Furnace check",
    status: "scheduled",
    scheduledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export function createWorkOrder(input: Omit<WorkOrder, "id" | "createdAt">) {
  const wo: WorkOrder = {
    id: `wo_${nextWorkOrderId++}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  workOrders.unshift(wo);
  return wo;
}

export function getWorkOrdersByLocation(locationId: string) {
  return workOrders.filter((w) => w.locationId === locationId);
}

export function getWorkOrdersByCustomer(customerId: string) {
  return workOrders.filter((w) => w.customerId === customerId);
}
