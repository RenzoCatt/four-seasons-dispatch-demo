"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  label: string;
  href: string;
};

const tabs: Tab[] = [
  { label: "Customer List", href: "/customers" },
  { label: "Add New Customer", href: "/customers/new" },
];

export default function CustomersSubtabs() {
  const pathname = usePathname();

  // exact match is safest here (avoids highlighting both)
  const isActive = (href: string) => pathname === href;

  return (
    <div className="mt-4 border-b border-gray-200">
      <nav className="flex gap-6 text-sm" aria-label="Customer navigation">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={[
              "pb-3 -mb-px",
              isActive(t.href)
                ? "border-b-2 border-sky-500 text-sky-700 font-medium"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
