import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import SidebarLink from "./components/SidebarLink";

export const metadata = {
  title: "4 Seasons Dispatch Demo",
  description: "Prototype dispatch system",
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/jobs", label: "Jobs" },
  { href: "/dispatch", label: "Disptach" },
  { href: "/techs", label: "Techs" },
  { href: "/reports", label: "Reports" },
  { href: "/pricebook/item-lookup", label: "Pricebook" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-dark text-white">
        <div className="flex min-h-screen">
          <aside className="w-56 bg-brand-dark border-r border-white/10 p-4">
          <Link href="/" className="flex items-center gap-3 mb-6">
            <Image
              src="/logo.png"
              alt="4 Seasons Home Comfort"
              width={72}
              height={72}
              priority
            />
            <div className="leading-tight">
              <div className="text-white font-semibold">4 Seasons</div>
              <div className="text-xs text-brand-muted">Dispatch Demo</div>
            </div>
          </Link>

            <nav className="space-y-1">
{nav.map((item) => (
  <SidebarLink key={item.href} href={item.href} label={item.label} />
))}

            </nav>
          </aside>

          <div className="flex-1 flex flex-col">
            {/* TOP BAR */}


            {/* PAGE CONTENT */}
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
