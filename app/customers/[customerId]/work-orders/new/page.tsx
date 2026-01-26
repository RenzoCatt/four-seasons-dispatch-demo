"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerNav from "../../../components/CustomerNav";

type LineItem = {
  id: string;
  kind: "SERVICE" | "MATERIAL";
  name: string;
  description: string;
  qty: number;
  unitPrice: number; // dollars
  taxable: boolean;
};

const TAX_RATE = 0.05; // GST 5%

function newItem(kind: LineItem["kind"]): LineItem {
  return {
    id: crypto.randomUUID(),
    kind,
    name: "",
    description: "",
    qty: 1,
    unitPrice: 0,
    taxable: true,
  };
}

function money(n: number) {
  return n.toFixed(2);
}

type Address = {
  id?: string;
  street: string;
  unit?: string;
  municipality?: string;
  province?: string;
  postalCode?: string;
  addressNotes?: string;
  isBilling?: boolean;
  isService?: boolean;
};

type Customer = {
  id: string;
  name: string;
  addresses?: Address[];
};

export default function NewWorkOrderFromCustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Work order form state
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<LineItem[]>([]);
  const [materials, setMaterials] = useState<LineItem[]>([]);

  useEffect(() => {
    async function loadCustomer() {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
        const data = (await res.json()) as Customer;
        setCustomer(data);
        setAddresses(data.addresses ?? []);
      } catch (e: any) {
        setError(e?.message || "Failed to load customer");
      } finally {
        setLoading(false);
      }
    }
    loadCustomer();
  }, [customerId]);

  const addService = () => setServices((prev) => [...prev, newItem("SERVICE")]);
  const addMaterial = () => setMaterials((prev) => [...prev, newItem("MATERIAL")]);

  const updateItem = (kind: LineItem["kind"], id: string, partial: Partial<LineItem>) => {
    const setter = kind === "SERVICE" ? setServices : setMaterials;
    setter((prev) => prev.map((i) => (i.id === id ? { ...i, ...partial } : i)));
  };

  const removeItem = (kind: LineItem["kind"], id: string) => {
    const setter = kind === "SERVICE" ? setServices : setMaterials;
    setter((prev) => prev.filter((i) => i.id !== id));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIndex === null) return;

    setSaving(true);
    setError("");

    try {
      const chosen = addresses[selectedIndex];
      const line1 = [chosen.street, chosen.unit ? `Unit ${chosen.unit}` : ""]
        .filter(Boolean)
        .join(", ");
      const line2 = [chosen.municipality, chosen.province, chosen.postalCode]
        .filter(Boolean)
        .join(", ");
      const serviceAddress = [line1, line2].filter(Boolean).join(" — ");

      const lineItems = [
        ...services.map((s) => ({ ...s, kind: "SERVICE" as const })),
        ...materials.map((m) => ({ ...m, kind: "MATERIAL" as const })),
      ];

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          serviceAddress,
          addressIndex: selectedIndex,
          description,
          lineItems,
        }),
      });

      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);

      const workOrder = await res.json();
      router.push(`/work-orders/${workOrder.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create work order");
    } finally {
      setSaving(false);
    }
  }

  const selectedAddress = selectedIndex !== null ? addresses[selectedIndex] : null;
  const canContinue = selectedIndex !== null;

  const serviceAddressLine1 = selectedAddress
    ? [selectedAddress.street, selectedAddress.unit ? `Unit ${selectedAddress.unit}` : ""]
        .filter(Boolean)
        .join(", ")
    : "";
  const serviceAddressLine2 = selectedAddress
    ? [selectedAddress.municipality, selectedAddress.province, selectedAddress.postalCode]
        .filter(Boolean)
        .join(", ")
    : "";

  const serviceSubtotal = services.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const materialSubtotal = materials.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const subtotal = serviceSubtotal + materialSubtotal;

  const taxableTotal =
    services.filter((i) => i.taxable).reduce((s, i) => s + i.qty * i.unitPrice, 0) +
    materials.filter((i) => i.taxable).reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const tax = taxableTotal * TAX_RATE;
  const total = subtotal + tax;

  if (loading) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading customer...</div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <h1 className="ui-title">Create Work Order</h1>
      <CustomerNav customerId={customerId} />

      {error && (
        <div className="mt-4 ui-card ui-card-pad">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* Step 1: Select Location */}
        <div className="ui-card ui-card-pad">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Step 1: Select Service Location</div>
              <div className="text-xs text-gray-500 mt-1">
                Primary is the first address. Pick where the work will happen.
              </div>
            </div>
          </div>

          {addresses.length === 0 ? (
            <div className="text-sm text-gray-500 py-4">
              No addresses found. Please add an address to the customer first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((a, idx) => {
                const selected = selectedIndex === idx;
                const label = idx === 0 ? "Primary" : "Service Location";
                const line1 = [a.street, a.unit ? `Unit ${a.unit}` : ""]
                  .filter(Boolean)
                  .join(", ");
                const line2 = [a.municipality, a.province, a.postalCode]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <button
                    key={a.id ?? idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={[
                      "text-left rounded-lg border bg-white p-4 transition shadow-sm",
                      selected
                        ? "border-sky-500 ring-2 ring-sky-100"
                        : "border-gray-200 hover:border-gray-300 hover:shadow",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold">{label}</div>
                          {selected && <div className="text-sky-600 text-sm font-semibold">✓</div>}
                        </div>

                        <div className="text-sm text-gray-800 mt-2">{line1}</div>
                        <div className="text-xs text-gray-500 mt-1">{line2}</div>

                        {a.addressNotes && (
                          <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {a.addressNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Work Order Details */}
        {canContinue && (
          <form onSubmit={handleSubmit} className="ui-card ui-card-pad">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold">Step 2: Work Order Details</div>
                <div className="text-xs text-gray-500 mt-1">
                  Add a short summary of what needs to be done.
                </div>
              </div>
            </div>

            {/* Service Address summary box */}
            <div className="ui-item p-4 mb-5">
              <div className="text-xs text-gray-500">Service address</div>
              <div className="text-sm font-medium text-gray-900 mt-1">{serviceAddressLine1}</div>
              <div className="text-xs text-gray-500 mt-1">{serviceAddressLine2}</div>
            </div>

            <div className="mb-5">
              <div className="text-sm text-gray-600 mb-2">Summary of work</div>
              <textarea
                className="ui-input"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs to be done? (e.g., furnace maintenance, AC repair, no heat call)"
                required
              />
            </div>

            {/* Line items */}
            <div className="ui-card ui-card-pad mt-6">
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

              {/* Services header */}
              <div className="py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-gray-800">Services</div>
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary"
                    onClick={() => setServices((prev) => [...prev, newItem("SERVICE")])}
                    title="Add service"
                  >
                    +
                  </button>
                </div>

                <div
                  className="text-sm text-sky-700 mt-2 cursor-pointer"
                  onClick={() => setServices((prev) => [...prev, newItem("SERVICE")])}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" ? setServices((prev) => [...prev, newItem("SERVICE")]) : null)}
                >
                  Add service
                </div>

                {services.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {services.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="grid grid-cols-12 gap-3 items-start">
                          <div className="col-span-12 lg:col-span-6">
                            <input
                              className="ui-input w-full"
                              placeholder="Service name (e.g., Furnace maintenance)"
                              value={item.name}
                              onChange={(e) => {
                                const v = e.target.value;
                                setServices((prev) => prev.map((x) => (x.id === item.id ? { ...x, name: v } : x)));
                              }}
                            />
                            <textarea
                              className="ui-input w-full mt-2"
                              rows={2}
                              placeholder="Description (optional)"
                              value={item.description}
                              onChange={(e) => {
                                const v = e.target.value;
                                setServices((prev) => prev.map((x) => (x.id === item.id ? { ...x, description: v } : x)));
                              }}
                            />
                            <label className="mt-2 inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={item.taxable}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setServices((prev) => prev.map((x) => (x.id === item.id ? { ...x, taxable: v } : x)));
                                }}
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
                              step={1}
                              value={item.qty}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                setServices((prev) => prev.map((x) => (x.id === item.id ? { ...x, qty: v } : x)));
                              }}
                            />
                          </div>

                          <div className="col-span-6 lg:col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Unit price</div>
                            <input
                              className="ui-input w-full"
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                setServices((prev) => prev.map((x) => (x.id === item.id ? { ...x, unitPrice: v } : x)));
                              }}
                            />
                          </div>

                          <div className="col-span-8 lg:col-span-1">
                            <div className="text-xs text-gray-500 mb-1">Total</div>
                            <div className="text-sm font-medium mt-2">${money(item.qty * item.unitPrice)}</div>
                          </div>

                          <div className="col-span-4 lg:col-span-1 flex justify-end">
                            <button
                              type="button"
                              className="ui-btn"
                              onClick={() => setServices((prev) => prev.filter((x) => x.id !== item.id))}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Materials header */}
              <div className="py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-gray-800">Materials</div>
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary"
                    onClick={() => setMaterials((prev) => [...prev, newItem("MATERIAL")])}
                    title="Add material"
                  >
                    +
                  </button>
                </div>

                <div
                  className="text-sm text-sky-700 mt-2 cursor-pointer"
                  onClick={() => setMaterials((prev) => [...prev, newItem("MATERIAL")])}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" ? setMaterials((prev) => [...prev, newItem("MATERIAL")]) : null)}
                >
                  Add material
                </div>

                {materials.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {materials.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="grid grid-cols-12 gap-3 items-start">
                          <div className="col-span-12 lg:col-span-6">
                            <input
                              className="ui-input w-full"
                              placeholder="Material name (e.g., Capacitor, PVC, Filter)"
                              value={item.name}
                              onChange={(e) => {
                                const v = e.target.value;
                                setMaterials((prev) => prev.map((x) => (x.id === item.id ? { ...x, name: v } : x)));
                              }}
                            />
                            <textarea
                              className="ui-input w-full mt-2"
                              rows={2}
                              placeholder="Description (optional)"
                              value={item.description}
                              onChange={(e) => {
                                const v = e.target.value;
                                setMaterials((prev) => prev.map((x) => (x.id === item.id ? { ...x, description: v } : x)));
                              }}
                            />
                            <label className="mt-2 inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={item.taxable}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setMaterials((prev) => prev.map((x) => (x.id === item.id ? { ...x, taxable: v } : x)));
                                }}
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
                              step={1}
                              value={item.qty}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                setMaterials((prev) => prev.map((x) => (x.id === item.id ? { ...x, qty: v } : x)));
                              }}
                            />
                          </div>

                          <div className="col-span-6 lg:col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Unit price</div>
                            <input
                              className="ui-input w-full"
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                setMaterials((prev) => prev.map((x) => (x.id === item.id ? { ...x, unitPrice: v } : x)));
                              }}
                            />
                          </div>

                          <div className="col-span-8 lg:col-span-1">
                            <div className="text-xs text-gray-500 mb-1">Total</div>
                            <div className="text-sm font-medium mt-2">${money(item.qty * item.unitPrice)}</div>
                          </div>

                          <div className="col-span-4 lg:col-span-1 flex justify-end">
                            <button
                              type="button"
                              className="ui-btn"
                              onClick={() => setMaterials((prev) => prev.filter((x) => x.id !== item.id))}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
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
                  <div className="text-lg font-semibold">${money(total)}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button type="button" className="ui-btn" onClick={() => router.back()} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                className="ui-btn ui-btn-primary"
                disabled={saving || !description.trim()}
              >
                {saving ? "Creating..." : "Create Work Order"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
