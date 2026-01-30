"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CustomerNav from "../components/CustomerNav";

type AddressType = {
  street: string;
  unit?: string | null;
  municipality?: string | null;
  province?: string | null;
  postalCode?: string | null;
  addressNotes?: string | null;
  isBilling?: boolean | null;
  isService?: boolean | null;
};

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  createdAt?: string | null;

  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  company?: string | null;
  role?: string | null;
  notes?: string | null;

  emails?: { value: string }[];
  phones?: { value: string; type?: string | null; note?: string | null }[];
  addresses?: AddressType[];
  tags?: { value: string }[];
};

function formatPhone(p?: string | null) {
  const digits = (p || "").replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p || "";
}

function fullAddress(a?: AddressType) {
  if (!a) return "";
  const street = [a.street, a.unit ? `Unit ${a.unit}` : ""].filter(Boolean).join(" ");
  const cityLine = [a.municipality, a.province, a.postalCode].filter(Boolean).join(", ");
  return [street, cityLine].filter(Boolean).join(", ");
}

export default function CustomerViewPage() {
  const { customerId } = useParams<{ customerId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Add address modal state
  const [addOpen, setAddOpen] = useState(false);
  const [locStreet, setLocStreet] = useState("");
  const [locUnit, setLocUnit] = useState("");
  const [locMunicipality, setLocMunicipality] = useState("");
  const [locProvince, setLocProvince] = useState("AB");
  const [locPostalCode, setLocPostalCode] = useState("");
  const [locNotes, setLocNotes] = useState("");
  const [locSaving, setLocSaving] = useState(false);
  const [locError, setLocError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      const data: Customer = await res.json();
      setCustomer(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function createAddressInline() {
    setLocSaving(true);
    setLocError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street: locStreet.trim(),
          unit: locUnit.trim() || undefined,
          municipality: locMunicipality.trim(),
          province: locProvince.trim(),
          postalCode: locPostalCode.trim(),
          addressNotes: locNotes.trim() || undefined,
          isService: true,
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to add address");
      }

      // reset + close
      setLocStreet("");
      setLocUnit("");
      setLocMunicipality("");
      setLocProvince("AB");
      setLocPostalCode("");
      setLocNotes("");
      setAddOpen(false);

      // reload customer data
      await load();
    } catch (e: any) {
      setLocError(e?.message || "Failed to add address");
    } finally {
      setLocSaving(false);
    }
  }

  const primaryDisplayName = useMemo(() => {
    if (!customer) return "";
    return (
      customer.displayName ||
      [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
      customer.name ||
      "Customer"
    );
  }, [customer]);

  const primaryEmail = useMemo(() => {
    if (!customer) return "";
    const list = (customer.emails || []).map((e) => e.value).filter(Boolean);
    return list[0] || customer.email || "";
  }, [customer]);

  const primaryPhone = useMemo(() => {
    if (!customer) return "";
    const list = (customer.phones || []).map((p) => p.value).filter(Boolean);
    return list[0] || customer.phone || "";
  }, [customer]);

  const primaryAddr = useMemo(() => {
    if (!customer) return undefined;
    const addrs = customer.addresses || [];
    const billing = addrs.find((a) => a.isBilling);
    return billing || addrs[0];
  }, [customer]);

  const mapQ = encodeURIComponent(fullAddress(primaryAddr) || "Lethbridge, AB");
  // No key required; this uses a simple embed query. (If you want a nicer Static Map image later, we can add an API key.)
  const mapSrc = `https://www.google.com/maps?q=${mapQ}&output=embed`;

  if (loading) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">Loading customer...</div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-pad">
          <div className="font-medium">Could not load customer</div>
          <div className="text-sm text-gray-600 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="ui-title">{primaryDisplayName}</h1>
          <div className="text-sm text-gray-600">
            {customer.company ? customer.company : ""}
            {customer.role ? (customer.company ? ` • ${customer.role}` : customer.role) : ""}
          </div>
        </div>
      </div>

      <CustomerNav customerId={customerId} />

      {error && (
        <div className="mt-4 ui-card ui-card-pad">
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      )}

      <div className="mt-6 grid lg:grid-cols-12 gap-6">
        {/* LEFT SIDEBAR */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="ui-card ui-card-pad">
            <div className="font-medium mb-3">Summary</div>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span className="text-gray-900">
                  {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Lifetime value</span>
                <span className="text-gray-900">$0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Outstanding balance</span>
                <span className="text-gray-900">$0.00</span>
              </div>
            </div>
          </div>

          <div className="ui-card ui-card-pad">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Contact info</div>
              <Link className="text-sm text-blue-600 hover:underline" href={`/customers/${customerId}/edit`}>
                Edit
              </Link>
            </div>

            <div className="text-sm space-y-3">
              <div>
                <div className="text-gray-500">Contact</div>
                <div className="text-gray-900">{primaryDisplayName}</div>
              </div>

              {customer.company && (
                <div>
                  <div className="text-gray-500">Company</div>
                  <div className="text-gray-900">{customer.company}</div>
                </div>
              )}

              <div>
                <div className="text-gray-500">Phone</div>
                <div className="text-gray-900">{formatPhone(primaryPhone) || "—"}</div>
              </div>

              <div>
                <div className="text-gray-500">Email</div>
                <div className="text-gray-900">{primaryEmail || "—"}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN */}
        <main className="lg:col-span-8 space-y-6">
          <div className="ui-card overflow-hidden">
            <div className="ui-card-pad flex items-center justify-between">
              <div className="font-medium">Service location</div>
              <div className="text-sm text-gray-600">
                {primaryAddr ? fullAddress(primaryAddr) : "No address on file"}
              </div>
            </div>
            <div className="h-[260px] w-full bg-gray-100">
              <iframe
                title="Map"
                src={mapSrc}
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div className="ui-card ui-card-pad">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">
                {(customer.addresses || []).length || 0} address{(customer.addresses || []).length === 1 ? "" : "es"}
              </div>
              <button className="ui-btn ui-btn-primary" onClick={() => setAddOpen(true)}>
                + Add address
              </button>
            </div>

            {(customer.addresses || []).length === 0 ? (
              <div className="text-sm text-gray-600">No addresses saved yet.</div>
            ) : (
              <div className="space-y-3">
                {(customer.addresses || []).map((a, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="text-gray-900">{a.street}</div>
                      <div className="text-sm text-gray-600">
                        {[a.municipality, a.province, a.postalCode].filter(Boolean).join(", ")}
                      </div>
                      <div className="mt-2 flex gap-2">
                        {a.isBilling && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">Billing</span>
                        )}
                        {(a.isService ?? true) && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">Service</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Link className="ui-btn" href={`/customers/${customerId}/work-orders/new?addressId=${encodeURIComponent(JSON.stringify({ street: a.street, municipality: a.municipality, province: a.province, postalCode: a.postalCode }))}`}>
                        Create Job
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ui-card ui-card-pad">
            <div className="font-medium mb-2">Private notes</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {customer.notes?.trim() ? customer.notes : "—"}
            </div>
          </div>
        </main>
      </div>

      {/* Add Address Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !locSaving && setAddOpen(false)}
          />

          {/* modal */}
          <div className="relative w-[92vw] max-w-2xl ui-card ui-card-pad">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-lg">Add address</div>
                <div className="text-sm text-gray-600">
                  Add a service location for this customer.
                </div>
              </div>

              <button
                className="ui-btn"
                onClick={() => !locSaving && setAddOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm text-gray-600 block mb-1">Street address</label>
                  <input
                    className="ui-input w-full"
                    value={locStreet}
                    onChange={(e) => setLocStreet(e.target.value)}
                    placeholder="123 4 Ave S"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Unit (optional)</label>
                  <input
                    className="ui-input w-full"
                    value={locUnit}
                    onChange={(e) => setLocUnit(e.target.value)}
                    placeholder="#5"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">City</label>
                  <input
                    className="ui-input w-full"
                    value={locMunicipality}
                    onChange={(e) => setLocMunicipality(e.target.value)}
                    placeholder="Lethbridge"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Province</label>
                  <input
                    className="ui-input w-full"
                    value={locProvince}
                    onChange={(e) => setLocProvince(e.target.value)}
                    placeholder="AB"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Postal Code</label>
                  <input
                    className="ui-input w-full"
                    value={locPostalCode}
                    onChange={(e) => setLocPostalCode(e.target.value)}
                    placeholder="T1J 0A1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">Notes (optional)</label>
                <textarea
                  className="ui-input w-full min-h-[90px]"
                  value={locNotes}
                  onChange={(e) => setLocNotes(e.target.value)}
                  placeholder="Gate code, dog in yard, park in alley..."
                />
              </div>

              {locError && <div className="text-sm text-red-600">{locError}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button className="ui-btn" onClick={() => !locSaving && setAddOpen(false)}>
                  Cancel
                </button>

                <button
                  className="ui-btn ui-btn-primary"
                  disabled={locSaving || !locStreet.trim() || !locMunicipality.trim() || !locProvince.trim() || !locPostalCode.trim()}
                  onClick={createAddressInline}
                >
                  {locSaving ? "Saving..." : "Save address"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
