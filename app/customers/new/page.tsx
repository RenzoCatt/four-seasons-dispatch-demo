"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ExtraEmail = { value: string };
type ExtraPhone = { value: string; note: string };

type AddressBlock = {
  street: string;
  unit: string;
  municipality: string;
  province: string;
  postalCode: string;
  addressNotes: string;
  // later: label/type + billing flag, etc.
};

const PROVINCES = [
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"
];

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function AddCustomerPage() {
  const router = useRouter();

  // Contact info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [company, setCompany] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [homePhone, setHomePhone] = useState("");
  const [role, setRole] = useState("");
  const [emailPrimary, setEmailPrimary] = useState("");
  const [workPhone, setWorkPhone] = useState("");

  const [customerType, setCustomerType] = useState<"HOMEOWNER" | "BUSINESS">("HOMEOWNER");

  const [extraEmails, setExtraEmails] = useState<ExtraEmail[]>([]);
  const [extraPhones, setExtraPhones] = useState<ExtraPhone[]>([]);

  // Address (start with 1 block; easy to extend to multiple)
  const [addresses, setAddresses] = useState<AddressBlock[]>([
    { street: "", unit: "", municipality: "", province: "AB", postalCode: "", addressNotes: "" },
  ]);

  // Notes section
  const [customerNotes, setCustomerNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [billsTo, setBillsTo] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [referredBy, setReferredBy] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill display name if user hasn’t typed one
  useEffect(() => {
    const auto = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    // only set if empty (don’t fight the user)
    if (!displayName.trim()) setDisplayName(auto || company.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, company]);

  const formattedPrimaryAddress = useMemo(() => {
    const a = addresses[0];
    if (!a) return "";
    const line1 = [a.street.trim(), a.unit.trim() ? `Unit ${a.unit.trim()}` : ""].filter(Boolean).join(", ");
    const line2 = [a.municipality.trim(), a.province.trim(), a.postalCode.trim()].filter(Boolean).join(", ");
    return [line1, line2].filter(Boolean).join(" — ");
  }, [addresses]);

  function addTagFromInput() {
    const raw = tagInput.trim();
    if (!raw) return;
    // allow comma separated too
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    setTags((prev) => {
      const set = new Set(prev);
      for (const p of parts) set.add(p);
      return Array.from(set);
    });
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Minimal validation (match your current expectations)
    const name = (displayName || `${firstName} ${lastName}`).trim();
    const phone = (mobilePhone || homePhone || workPhone).trim();
    const address = formattedPrimaryAddress.trim();

    if (!name || !phone || !address) {
      setError("Display name, a phone number, and an address are required.");
      return;
    }

    setSaving(true);
    try {
      const resCustomer = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // expanded fields
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          displayName: displayName.trim() || undefined,
          company: company.trim() || undefined,
          role: role.trim() || undefined,
          customerType,
          emails: [emailPrimary.trim(), ...extraEmails.map((x) => x.value.trim())].filter(Boolean),
          phones: [
            { type: "mobile", value: mobilePhone.trim() },
            { type: "home", value: homePhone.trim() },
            { type: "work", value: workPhone.trim() },
            ...extraPhones.map((p) => ({ type: "other", value: p.value.trim(), note: p.note.trim() })),
          ].filter((p: any) => p.value),
          addresses,
          tags,
          billsTo: billsTo.trim() || undefined,
          leadSource: leadSource.trim() || undefined,
          referredBy: referredBy.trim() || undefined,

          // legacy fields for list/search
          name,
          phone,
          address,
          notes: customerNotes || undefined,
        }),
      });

      if (!resCustomer.ok) {
        const txt = await resCustomer.text().catch(() => "");
        throw new Error(txt || "Failed to create customer");
      }

      const customer = await resCustomer.json(); // expects { id }
      router.push(`/customers/${customer.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ui-page">
      <div className="space-y-2">
        <h1 className="ui-title">Add new customer</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="ui-card ui-card-pad border-red-300 bg-red-50">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Contact info */}
        <div className="ui-card ui-card-pad">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-sm font-semibold">Contact info</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input className="ui-input" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="ui-input" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input className="ui-input" placeholder="Mobile phone" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} />
            <input className="ui-input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />

            <div className="md:col-span-2">
              <input
                className="ui-input"
                placeholder="Display name (shown on invoices)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <input className="ui-input" placeholder="Home phone" value={homePhone} onChange={(e) => setHomePhone(e.target.value)} />
            <input className="ui-input" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />

            <div className="md:col-span-2">
              <input className="ui-input" placeholder="Email" value={emailPrimary} onChange={(e) => setEmailPrimary(e.target.value)} />
            </div>

            <input className="ui-input" placeholder="Work phone" value={workPhone} onChange={(e) => setWorkPhone(e.target.value)} />

            <div className="flex items-center gap-6 md:col-span-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={customerType === "HOMEOWNER"}
                  onChange={() => setCustomerType("HOMEOWNER")}
                />
                Homeowner
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={customerType === "BUSINESS"}
                  onChange={() => setCustomerType("BUSINESS")}
                />
                Business
              </label>
            </div>
          </div>

          {/* extra emails */}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              className="ui-btn"
              onClick={() => setExtraEmails((prev) => [...prev, { value: "" }])}
            >
              + Email
            </button>

            <button
              type="button"
              className="ui-btn"
              onClick={() => setExtraPhones((prev) => [...prev, { value: "", note: "" }])}
            >
              + Phone
            </button>
          </div>

          {(extraEmails.length > 0 || extraPhones.length > 0) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* extra emails column */}
              <div className="space-y-3">
                {extraEmails.map((em, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="ui-input"
                      placeholder="Email"
                      value={em.value}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExtraEmails((prev) => prev.map((x, i) => (i === idx ? { value: v } : x)));
                      }}
                    />
                    <button
                      type="button"
                      className="ui-btn"
                      onClick={() => setExtraEmails((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove email"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* extra phones column */}
              <div className="space-y-3">
                {extraPhones.map((ph, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input
                      className="ui-input"
                      placeholder="Additional phone"
                      value={ph.value}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExtraPhones((prev) => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)));
                      }}
                    />
                    <input
                      className="ui-input"
                      placeholder="Note"
                      value={ph.note}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExtraPhones((prev) => prev.map((x, i) => (i === idx ? { ...x, note: v } : x)));
                      }}
                    />
                    <button
                      type="button"
                      className="ui-btn"
                      onClick={() => setExtraPhones((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove phone"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="ui-card ui-card-pad">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Address</div>
            {/* later: "+ Address" to add multiple blocks like the reference UI */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Only first address block for now */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <input
                    className="ui-input"
                    placeholder="Street"
                    value={addresses[0].street}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAddresses((prev) => [{ ...prev[0], street: v }]);
                    }}
                  />
                </div>

                <input
                  className="ui-input"
                  placeholder="Unit"
                  value={addresses[0].unit}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAddresses((prev) => [{ ...prev[0], unit: v }]);
                  }}
                />

                <div className="md:col-span-2">
                  <input
                    className="ui-input"
                    placeholder="Municipality"
                    value={addresses[0].municipality}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAddresses((prev) => [{ ...prev[0], municipality: v }]);
                    }}
                  />
                </div>

                <select
                  className="ui-select"
                  value={addresses[0].province}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAddresses((prev) => [{ ...prev[0], province: v }]);
                  }}
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <input
                  className="ui-input"
                  placeholder="Postal code"
                  value={addresses[0].postalCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAddresses((prev) => [{ ...prev[0], postalCode: v }]);
                  }}
                />

                <div className="md:col-span-4">
                  <input
                    className="ui-input"
                    placeholder="Address Notes"
                    value={addresses[0].addressNotes}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAddresses((prev) => [{ ...prev[0], addressNotes: v }]);
                    }}
                  />
                </div>
              </div>

              <button type="button" className="ui-btn" disabled>
                + Address
              </button>
              <div className="text-xs text-gray-500">
                (Multiple addresses + billing/service toggle is next — UI is staged here.)
              </div>
            </div>

            {/* Map placeholder (hook up Google Maps later) */}
            <div className="ui-item flex items-center justify-center min-h-[220px] text-sm text-gray-600">
              Map preview (hook up Google Maps here)
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="ui-card ui-card-pad">
          <div className="text-sm font-semibold mb-4">Notes</div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <textarea
                className="ui-input"
                placeholder="Customer notes"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                style={{ minHeight: 110 }}
              />

              <div>
                <input
                  className="ui-input"
                  placeholder="Customer tags (press enter)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTagFromInput();
                    }
                  }}
                  onBlur={() => addTagFromInput()}
                />

                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span key={t} className="ui-item py-1 px-2 text-xs flex items-center gap-2">
                        {t}
                        <button type="button" className="text-gray-500 hover:text-gray-900" onClick={() => removeTag(t)}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <input
                className="ui-input"
                placeholder="This customer bills to"
                value={billsTo}
                onChange={(e) => setBillsTo(e.target.value)}
              />
              <input
                className="ui-input"
                placeholder="Lead source"
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
              />
              <div className="pt-2">
                <div className="text-sm font-semibold mb-3">Referred by</div>
                <input
                  className="ui-input"
                  placeholder="Referred by"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <button className="ui-btn ui-btn-primary ui-btn-block" disabled={saving}>
          {saving ? "Saving..." : "Save Customer"}
        </button>
      </form>
    </div>
  );
}