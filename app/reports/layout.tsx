"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Sidebar */}
      <aside className="col-span-12 lg:col-span-3">
        <div className="sticky top-6">
          <div className="ui-card ui-card-pad">
            <div className="font-semibold mb-4">Reporting</div>

            <div className="space-y-1 text-sm">
              <Link
                href="/reports/invoices/create"
                className={`block rounded px-3 py-2 transition ${
                  isActive("/reports/invoices/create", pathname)
                    ? "bg-brand-blue text-white font-medium"
                    : "hover:bg-white/5"
                }`}
              >
                Create Invoices
              </Link>

              <Link
                href="/reports/invoices"
                className={`block rounded px-3 py-2 transition ${
                  isActive("/reports/invoices", pathname) && !pathname.includes("/create")
                    ? "bg-brand-blue text-white font-medium"
                    : "hover:bg-white/5"
                }`}
              >
                Invoice Dashboard
              </Link>

              <div className="block rounded px-3 py-2 opacity-50 text-gray-500 cursor-not-allowed">
                Payments (soon)
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="col-span-12 lg:col-span-9">{children}</main>
    </div>
  );
}
