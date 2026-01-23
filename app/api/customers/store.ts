export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
};

// simple id generator: c_1, c_2, ...
let nextId = 4;

export const customers: Customer[] = [
  { id: "c_1", name: "Renzo Cattoni", phone: "4038924161", address: "954 13th Street S", notes: "Help" },
  { id: "c_2", name: "Sarah Thompson", phone: "403-555-0111", address: "12 Ridgewood Dr, Lethbridge", notes: "Prefers afternoon calls" },
  { id: "c_3", name: "Mike Reynolds", phone: "403-555-0222", address: "954 13th St S, Lethbridge" },
];

export function createCustomer(input: Omit<Customer, "id">) {
  const c: Customer = { id: `c_${nextId++}`, ...input };
  customers.unshift(c);
  return c;
}

export function findCustomer(id: string) {
  return customers.find((c) => c.id === id) ?? null;
}

export function updateCustomer(id: string, patch: Partial<Omit<Customer, "id">>) {
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  customers[idx] = { ...customers[idx], ...patch };
  return customers[idx];
}
