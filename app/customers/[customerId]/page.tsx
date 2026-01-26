"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerNav from "../components/CustomerNav";

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;

  // identity fields
  firstName?: string;
  lastName?: string;
  displayName?: string;
  company?: string;
  role?: string;

  // expanded (optional for now)
  emails?: { value: string }[];
  phones?: { value: string; type?: string; note?: string }[];
  addresses?: {
    street: string;
    unit?: string;
    municipality?: string;
    province?: string;
    postalCode?: string;
    addressNotes?: string;
    isBilling?: boolean;
    isService?: boolean;
  }[];
  tags?: { value: string }[];
};

type PhoneRow = { value: string; type: string };

export default function CustomerAccountInfoPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState<Customer | null>(null);

  // legacy base fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // identity fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  // expanded UI state (edit-friendly shapes)
  const [emails, setEmails] = useState<string[]>([]);
  const [phones, setPhones] = useState<PhoneRow[]>([]);
  const [addresses, setAddresses] = useState<
    Array<{
      street: string;
      unit?: string;
      municipality?: string;
      province?: string;
      postalCode?: string;
      addressNotes?: string;
      isBilling?: boolean;
      isService?: boolean;
    }>
  >([]);
  const [tags, setTags] = useState<string[]>([]);

  async function loadCustomer() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      const data: Customer = await res.json();

      setCustomer(data);

      setName(data.name || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setNotes(data.notes || "");

      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setDisplayName(data.displayName || "");
      setCompany(data.company || "");
      setRole(data.role || "");

      setEmails((data.emails || []).map((e) => e.value));
      setPhones(
        (data.phones || []).map((p) => ({
          value: p.value,
          type: (p.type || "MOBILE").toUpperCase(),
        }))
      );
      setAddresses(
        (data.addresses || []).map((a) => ({
          street: a.street || "",
          unit: a.unit || "",
          municipality: a.municipality || "",
          province: a.province || "",
          postalCode: a.postalCode || "",
          addressNotes: a.addressNotes || "",
          isBilling: Boolean(a.isBilling),
          isService: a.isService === undefined ? true : Boolean(a.isService),
        }))
      );
      setTags((data.tags || []).map((t) => t.value));
    } catch (e: any) {
      setError(e?.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function save(closeAfter: boolean) {
    setSaving(true);
    setError("");

    try {
      const computedName =
        (displayName || `${firstName} ${lastName}`).trim() || name;

      const payload = {
        name: computedName,
        phone,
        address,
        notes,

        // identity fields
        firstName,
        lastName,
        displayName,
        company,
        role,

        // expanded fields (we'll make the API store these properly)
        emails: emails.filter(Boolean),
        phones: phones
          .filter((p) => p.value?.trim())
          .map((p) => ({
            value: p.value.trim(),
            type: (p.type || "MOBILE").toUpperCase(),
          })),
        addresses: addresses
          .filter((a) => a.street?.trim())
          .map((a) => ({
            street: a.street.trim(),
            unit: a.unit?.trim() || undefined,
            municipality: a.municipality?.trim() || undefined,
            province: a.province?.trim() || undefined,
            postalCode: a.postalCode?.trim() || undefined,
            addressNotes: a.addressNotes?.trim() || undefined,
            isBilling: Boolean(a.isBilling),
            isService: a.isService === undefined ? true : Boolean(a.isService),
          })),
        tags: tags.filter(Boolean),
      };

      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);

      await loadCustomer();
      if (closeAfter) router.push("/customers");
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

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
        <div className="space-y-2">
          <h1 className="ui-title">Edit Customer: {customer.name}</h1>
          <p className="ui-subtitle">Account Info</p>
        </div>

        <div className="flex gap-2">
          <button className="ui-btn" onClick={() => save(true)} disabled={saving}>
            {saving ? "Saving..." : "Save & Close"}
          </button>
          <button className="ui-btn ui-btn-primary" onClick={() => save(false)} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <CustomerNav customerId={customerId} />

      {error && (
        <div className="mt-4 ui-card ui-card-pad">
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      )}

      <div className="mt-6">
        <main>
          <div className="ui-card ui-card-pad space-y-4">
            <div className="font-medium">Identity & Key Contact</div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">First name</div>
                <input className="ui-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Last name</div>
                <input className="ui-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 mb-1">Display name (shown on invoices)</div>
                <input className="ui-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Company</div>
                <input className="ui-input" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Role</div>
                <input className="ui-input" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 mb-1">Primary phone</div>
                <input className="ui-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 mb-1">Internal/Private Notes</div>
                <textarea className="ui-input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            {/* Expanded Fields */}
            <div className="grid md:grid-cols-2 gap-6 pt-2">
              {/* Emails */}
              <div>
                <div className="text-sm text-gray-600 mb-2">Emails</div>
                {emails.map((email, i) => (
                  <div key={i} className="flex w-full gap-2 mb-2 items-center">
                    <input
                      className="ui-input ui-input-inline flex-1 min-w-0"
                      value={email}
                      onChange={(e) => {
                        const arr = [...emails];
                        arr[i] = e.target.value;
                        setEmails(arr);
                      }}
                      placeholder="Email"
                    />
                    <button type="button" className="ui-btn shrink-0" onClick={() => setEmails(emails.filter((_, idx) => idx !== i))}>
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="ui-btn ui-btn-primary" onClick={() => setEmails([...emails, ""])}>
                  Add Email
                </button>
              </div>

              {/* Phones */}
              <div>
                <div className="text-sm text-gray-600 mb-2">Phones</div>
                {phones.map((phoneObj, i) => (
                  <div key={i} className="flex w-full gap-2 items-center mb-2">
                    <input
                      className="ui-input ui-input-inline flex-1 min-w-0"
                      value={phoneObj.value}
                      onChange={(e) => {
                        const arr = [...phones];
                        arr[i] = { ...arr[i], value: e.target.value };
                        setPhones(arr);
                      }}
                      placeholder="Phone number"
                    />
                    <select
                      className="ui-input ui-input-inline w-40 shrink-0"
                      value={phoneObj.type}
                      onChange={(e) => {
                        const arr = [...phones];
                        arr[i] = { ...arr[i], type: e.target.value };
                        setPhones(arr);
                      }}
                    >
                      <option value="MOBILE">Mobile</option>
                      <option value="HOME">Home</option>
                      <option value="WORK">Work</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <button
                      type="button"
                      className="ui-btn shrink-0"
                      onClick={() => setPhones(phones.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  onClick={() => setPhones([...phones, { value: "", type: "MOBILE" }])}
                >
                  Add Phone
                </button>
              </div>

              {/* Addresses */}
              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 mb-2">Addresses</div>
                <div className="text-xs text-gray-500 mb-3">
                  Primary Address = first address below. Add more addresses for additional service locations (rental, shop, etc.).
                </div>
                {addresses.map((addr, i) => (
                  <div key={i} className="space-y-2 mb-4 pb-4 border-b border-gray-200 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      {i === 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                          Primary
                        </span>
                      )}
                      {i > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                          Service Location
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-2 items-center">
                    <input
                      className="ui-input col-span-2"
                      value={addr.street}
                      onChange={(e) => {
                        const arr = [...addresses];
                        arr[i] = { ...arr[i], street: e.target.value };
                        setAddresses(arr);
                      }}
                      placeholder="Street"
                    />
                    <input
                      className="ui-input col-span-1"
                      value={addr.unit || ""}
                      onChange={(e) => {
                        const arr = [...addresses];
                        arr[i] = { ...arr[i], unit: e.target.value };
                        setAddresses(arr);
                      }}
                      placeholder="Unit"
                    />
                    <input
                      className="ui-input col-span-1"
                      value={addr.municipality || ""}
                      onChange={(e) => {
                        const arr = [...addresses];
                        arr[i] = { ...arr[i], municipality: e.target.value };
                        setAddresses(arr);
                      }}
                      placeholder="City"
                    />
                    <input
                      className="ui-input col-span-1"
                      value={addr.province || ""}
                      onChange={(e) => {
                        const arr = [...addresses];
                        arr[i] = { ...arr[i], province: e.target.value };
                        setAddresses(arr);
                      }}
                      placeholder="Province"
                    />
                    <input
                      className="ui-input col-span-1"
                      value={addr.postalCode || ""}
                      onChange={(e) => {
                        const arr = [...addresses];
                        arr[i] = { ...arr[i], postalCode: e.target.value };
                        setAddresses(arr);
                      }}
                      placeholder="Postal Code"
                    />

                    <input
                      className="ui-input col-span-2"
                      value={addr.addressNotes || ""}
                      onChange={(e) => {
                        const arr = [...addresses];
                        arr[i] = { ...arr[i], addressNotes: e.target.value };
                        setAddresses(arr);
                      }}
                      placeholder="Notes"
                    />

                    <label className="col-span-1 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={i === 0 ? true : !!addr.isBilling}
                        disabled={i === 0}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAddresses((prev) =>
                            prev.map((a, idx) =>
                              idx === i ? { ...a, isBilling: checked } : { ...a, isBilling: false }
                            )
                          );
                        }}
                      />
                      Billing
                    </label>

                    <label className="col-span-1 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={addr.isService === undefined ? true : !!addr.isService}
                        onChange={(e) => {
                          const arr = [...addresses];
                          arr[i] = { ...arr[i], isService: e.target.checked };
                          setAddresses(arr);
                        }}
                      />
                      Service
                    </label>

                    <button type="button" className="ui-btn col-span-1" onClick={() => setAddresses(addresses.filter((_, idx) => idx !== i))}>
                      Remove
                    </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  onClick={() => setAddresses([...addresses, { street: "", municipality: "", province: "", postalCode: "", isService: true }])}
                >
                  Add Address
                </button>
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 mb-2">Tags</div>
                {tags.map((tag, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      className="ui-input flex-1"
                      value={tag}
                      onChange={(e) => {
                        const arr = [...tags];
                        arr[i] = e.target.value;
                        setTags(arr);
                      }}
                      placeholder="Tag"
                    />
                    <button type="button" className="ui-btn" onClick={() => setTags(tags.filter((_, idx) => idx !== i))}>
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="ui-btn ui-btn-primary" onClick={() => setTags([...tags, ""])}>
                  Add Tag
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}