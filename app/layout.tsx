import "./globals.css";
import SidebarLink from "./components/SidebarLink";

export const metadata = {
  title: "4 Seasons Dispatch Demo",
  description: "Prototype dispatch system",
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/work-orders", label: "Work Orders" },
  { href: "/techs", label: "Techs" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-dark text-white">
        <div className="flex min-h-screen">
          <aside className="w-56 bg-brand-dark border-r border-white/10 p-4">
<div className="font-semibold text-lg text-white">4 Seasons</div>
<div className="text-xs text-brand-muted mb-4">Dispatch Demo</div>

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
