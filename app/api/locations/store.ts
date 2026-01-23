export type Location = {
  id: string;
  customerId: string;
  name: string;       // “Home”, “Rental”, “Shop”
  address: string;
  notes?: string;
};

let nextLocationId = 3;

export const locations: Location[] = [
  { id: "l_1", customerId: "c_1", name: "Home", address: "954 13th Street S" },
  { id: "l_2", customerId: "c_1", name: "Rental", address: "12 Ridgewood Dr, Lethbridge", notes: "Call tenant first" },
];

export function createLocation(input: Omit<Location, "id">) {
  const loc: Location = { id: `l_${nextLocationId++}`, ...input };
  locations.unshift(loc);
  return loc;
}

export function getLocationsByCustomer(customerId: string) {
  return locations.filter((l) => l.customerId === customerId);
}

export function findLocation(id: string) {
  return locations.find((l) => l.id === id) ?? null;
}
