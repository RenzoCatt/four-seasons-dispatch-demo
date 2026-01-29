"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CustomerNav({ customerId }: { customerId: string }) {
  const pathname = usePathname();

  const items = [
    { label: "Account Info", href: `/customers/${customerId}` },
    { label: "Service Locations", href: `/customers/${customerId}/locations` },
  ];

  const active = (href: string) => pathname === href;

  return (
    <div className="mt-4 border-b border-gray-200">
      <div className="flex items-center justify-between gap-6">
        <div className="flex gap-6 text-sm">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "pb-3 -mb-px",
                active(it.href)
                  ? "border-b-2 border-sky-500 text-sky-700 font-medium"
                  : "text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              {it.label}
            </Link>
          ))}
        </div>
        <Link
          href={`/customers/${customerId}/work-orders/new`}
          className="ui-btn ui-btn-primary text-sm mb-3"
        >
          Create Job
        </Link>
      </div>
    </div>
  );
}
