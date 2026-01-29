"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerNav from "../../../components/CustomerNav";
import LineItemsCard from "@/app/components/LineItemsCard";

type LineItem = {
  id: string;
  kind: "SERVICE" | "MATERIAL";
  name: string;
  description: string;
  qty: string;
  unitPrice: string; // stored as string for precision
  taxable: boolean;
  // Price book fields
  priceBookItemId?: string;
  rateTier?: "STANDARD" | "MEMBER" | "RUMI";
  availableRates?: Partial<Record<"STANDARD" | "MEMBER" | "RUMI", number>>;
};

const TAX_RATE = 0.05; // GST 5%

function newItem(kind: LineItem["kind"]): LineItem {
  return {
    id: crypto.randomUUID(),
    kind,
    name: "",
    description: "",
    qty: "1.00",
    unitPrice: "0.00",
    taxable: true,
  };
}

function money(n: unknown) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
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

  // Price book picker state
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceResults, setServiceResults] = useState<any[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);

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

  // Search services from price book
  async function searchServices(q: string) {
    setServiceLoading(true);
    try {
      const res = await fetch(
        `/api/pricebook/search?q=${encodeURIComponent(q)}&tier=STANDARD&limit=200`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      const data = await res.json();
      setServiceResults(data.items ?? data ?? []);
    } catch (e: any) {
      console.error("Error searching services:", e);
      setServiceResults([]);
    } finally {
      setServiceLoading(false);
    }
  }

  // Load default items when modal opens
  useEffect(() => {
    if (!servicePickerOpen) return;
    searchServices(""); // load top services on open
  }, [servicePickerOpen]);

  // Debounced search
  useEffect(() => {
    if (!servicePickerOpen) return;
    const t = setTimeout(() => {
      searchServices(serviceQuery.trim());
    }, 200);
    return () => clearTimeout(t);
  }, [serviceQuery, servicePickerOpen]);

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
        ...services.map((s) => ({
          kind: "SERVICE" as const,
          description: s.name,
          details: s.description,
          qty: parseFloat(s.qty) || 0,
          unitPrice: parseFloat(s.unitPrice) || 0,
          taxable: !!s.taxable,
          priceBookItemId: s.priceBookItemId ?? null,
          rateTier: s.rateTier ?? null,
        })),
        ...materials.map((m) => ({
          kind: "MATERIAL" as const,
          description: m.name,
          details: m.description,
          qty: parseFloat(m.qty) || 0,
          unitPrice: parseFloat(m.unitPrice) || 0,
          taxable: !!m.taxable,
          priceBookItemId: m.priceBookItemId ?? null,
          rateTier: m.rateTier ?? null,
        })),
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
      router.push(`/jobs/${workOrder.id}`);
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

  const serviceSubtotal = services.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const materialSubtotal = materials.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const subtotal = serviceSubtotal + materialSubtotal;

  const taxableTotal =
    services.filter((i) => i.taxable).reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0) +
    materials.filter((i) => i.taxable).reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0);

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
      <button
        type="button"
        className="ui-btn"
        onClick={() => router.push("/customers?createJob=1")}
      >
        Back to customer search
      </button>

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
                    onClick={() => {
                      setServicePickerOpen(true);
                      setServiceQuery("");
                    }}
                    title="Add service"
                  >
                    +
                  </button>
                </div>

                <div
                  className="text-sm text-sky-700 mt-2 cursor-pointer"
                  onClick={() => {
                    setServicePickerOpen(true);
                    setServiceQuery("");
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setServicePickerOpen(true);
                      setServiceQuery("");
                    }
                  }}
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
                            {item.availableRates && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="text-xs text-gray-500">Rate</div>
                                <select
                                  className="ui-input w-40"
                                  value={item.rateTier ?? "STANDARD"}
                                  onChange={(e) => {
                                    const tier = e.target.value as "STANDARD" | "MEMBER" | "RUMI";
                                    const price = Number(item.availableRates?.[tier] ?? item.unitPrice);
                                    setServices((prev) =>
                                      prev.map((x) => (x.id === item.id ? { ...x, rateTier: tier, unitPrice: price.toFixed(2) } : x))
                                    );
                                  }}
                                >
                                  {item.availableRates.STANDARD != null && <option value="STANDARD">Standard</option>}
                                  {item.availableRates.MEMBER != null && <option value="MEMBER">Member</option>}
                                  {item.availableRates.RUMI != null && <option value="RUMI">Rumi</option>}
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="col-span-6 lg:col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Qty</div>
                            <input
                              className="ui-input w-full"
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.qty}
                              onChange={(e) => {
                                setServices((prev) => prev.map((x) => (x.id === item.id ? { ...x, qty: e.target.value } : x)));
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
                                setServices((prev) => prev.map((x) => (x.id === item.id ? { ...x, unitPrice: e.target.value } : x)));
                              }}
                            />
                          </div>

                          <div className="col-span-8 lg:col-span-1">
                            <div className="text-xs text-gray-500 mb-1">Total</div>
                            <div className="text-sm font-medium mt-2">${money((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0))}</div>
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
                              step="0.01"
                              value={item.qty}
                              onChange={(e) => {
                                setMaterials((prev) => prev.map((x) => (x.id === item.id ? { ...x, qty: e.target.value } : x)));
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
                                setMaterials((prev) => prev.map((x) => (x.id === item.id ? { ...x, unitPrice: e.target.value } : x)));
                              }}
                            />
                          </div>

                          <div className="col-span-8 lg:col-span-1">
                            <div className="text-xs text-gray-500 mb-1">Total</div>
                            <div className="text-sm font-medium mt-2">${money((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0))}</div>
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

            {error && (
              <div className="ui-item p-3 mb-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button type="button" className="ui-btn" onClick={() => router.back()} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                className="ui-btn ui-btn-primary"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Work Order"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Price Book Picker Modal */}
      {servicePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setServicePickerOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Add Service</h2>
                <button
                  type="button"
                  onClick={() => setServicePickerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                className="ui-input w-full"
                placeholder="Search services..."
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {serviceLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (
                <ServiceResultsList
                  items={serviceResults}
                  onPick={(item) => {
                    const rates = item.rates ?? {};
                    const defaultTier =
                      rates.STANDARD != null
                        ? "STANDARD"
                        : rates.MEMBER != null
                        ? "MEMBER"
                        : rates.RUMI != null
                        ? "RUMI"
                        : "STANDARD";
                    const unitPrice = Number(rates[defaultTier] ?? item.unitPrice ?? 0);

                    const newService: LineItem = {
                      id: crypto.randomUUID(),
                      kind: "SERVICE",
                      name: item.name,
                      description: item.description ?? "",
                      qty: "1.00",
                      unitPrice: unitPrice.toFixed(2),
                      taxable: item.taxableDefault ?? true,
                      priceBookItemId: item.id,
                      rateTier: defaultTier,
                      availableRates: rates,
                    };
                    setServices((prev) => [...prev, newService]);
                    setServicePickerOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component to group results by category
function ServiceResultsList({ items, onPick }: { items: any[]; onPick: (item: any) => void }) {
  if (!items.length) {
    return <div className="text-sm text-gray-500">No results found. Try searching for services like "furnace" or "repair".</div>;
  }

  // Group by category
  const byCategory: Record<string, any[]> = {};
  for (const item of items) {
    const cat = item.category || "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }

  return (
    <div className="space-y-4">
      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat}>
          <div className="text-sm font-semibold text-gray-700 mb-2">{cat}</div>
          <div className="space-y-1">
            {catItems.map((item) => (
              <div
                key={item.id}
                className="p-3 border rounded hover:bg-blue-50 cursor-pointer"
                onClick={() => onPick(item)}
              >
                <div className="font-medium text-sm">{item.name}</div>
                {item.description && <div className="text-xs text-gray-600 mt-1">{item.description}</div>}
                <div className="text-sm font-semibold text-gray-800 mt-1">${money(item.unitPrice)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
