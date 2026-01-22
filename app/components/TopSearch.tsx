"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TopSearch() {
  const router = useRouter();
  const pathname = usePathname();

  const isWorkOrders = pathname.startsWith("/work-orders");
  const targetPath = isWorkOrders ? "/work-orders" : "/customers";

  const [q, setQ] = useState("");

  useEffect(() => {
    setQ("");
  }, [targetPath]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(`${targetPath}${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <div className="ui-card ui-card-pad">
      <form onSubmit={onSubmit}>
        <input
          className="ui-input"
          placeholder={isWorkOrders ? "Search work orders..." : "Search customers..."}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
    </div>
  );
}
