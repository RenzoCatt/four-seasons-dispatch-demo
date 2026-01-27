"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TopSearch() {
  const router = useRouter();
  const pathname = usePathname();

  const isJobs = pathname.startsWith("/jobs");
  const targetPath = isJobs ? "/jobs" : "/customers";

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
          placeholder={isJobs ? "Search jobs..." : "Search customers..."}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
    </div>
  );
}
