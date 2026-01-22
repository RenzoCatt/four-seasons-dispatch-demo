"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();

  const isActive =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm transition
        ${isActive
          ? "bg-brand-blue text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
    >
      {label}
    </Link>
  );
}
