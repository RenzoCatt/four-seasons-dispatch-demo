"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CustomerNav({ customerId }: { customerId: string }) {
  const pathname = usePathname();

  const items = [
    { label: "Customer", href: `/customers/${customerId}` },
    { label: "Locations", href: `/customers/${customerId}/locations` },
    { label: "New Work Order", href: `/customers/${customerId}/work-orders/new` },
    { label: "Edit", href: `/customers/${customerId}/edit` },
  ];

  const active = (href: string) => pathname === href;

  return (
    <div className="mt-4 border-b border-gray-200">
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
    </div>
  );
}
