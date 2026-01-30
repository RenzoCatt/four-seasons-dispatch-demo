"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CustomerNav({
  customerId,
  mode = "view",
  onSaveChanges,
}: {
  customerId: string;
  mode?: "view" | "edit";
  onSaveChanges?: () => void;
}) {
  const pathname = usePathname();

  const tabs = [
    { label: "Account Info", href: `/customers/${customerId}` },
    { label: "Jobs", href: `/customers/${customerId}/work-orders` },
    { label: "Invoices", href: `/customers/${customerId}/invoices` },
  ];

  const isActive = (href: string) => {
    if (href.endsWith("/work-orders")) return pathname.startsWith(href);
    if (href.endsWith("/invoices")) return pathname.startsWith(href);
    return pathname === href;
  };

  const btnBase =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap";
  const btnOutlineBlue = `${btnBase} border border-blue-600 text-blue-700 hover:bg-blue-50`;
  const btnSolidBlue = `${btnBase} bg-blue-600 text-white hover:bg-blue-700`;
  const btnOutlineGray = `${btnBase} border border-gray-300 text-gray-800 hover:bg-gray-50`;

  return (
    <div className="mt-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-10">
              {tabs.map((tab) => {
                const active = isActive(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={[
                      "relative py-4 text-sm font-semibold transition-colors",
                      active ? "text-blue-700" : "text-gray-600 hover:text-gray-900",
                    ].join(" ")}
                  >
                    {tab.label}
                    <span
                      className={[
                        "absolute left-0 right-0 -bottom-[1px] h-[3px] rounded-full",
                        active ? "bg-blue-600" : "bg-transparent",
                      ].join(" ")}
                    />
                  </Link>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/customers/${customerId}/work-orders/new`}
                className={btnOutlineBlue}
              >
                + Job
              </Link>

              <Link
                href={`/reports/invoices/create?customerId=${customerId}`}
                className={btnSolidBlue}
              >
                + Invoice
              </Link>

              <div className="mx-1 h-6 w-px bg-gray-200" />

              {mode === "edit" ? (
                <button
                  type="button"
                  className={btnOutlineGray}
                  onClick={() => onSaveChanges?.()}
                >
                  Save changes
                </button>
              ) : (
                <Link
                  href={`/customers/${customerId}/edit`}
                  className={btnOutlineGray}
                >
                  Edit customer
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
