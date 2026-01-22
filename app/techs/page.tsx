"use client";

import { useEffect, useState } from "react";

type Technician = { id: string; name: string; status: "Available" | "Busy" };

export default function TechsPage() {
  const [techs, setTechs] = useState<Technician[]>([]);

  useEffect(() => {
    fetch("/api/techs")
      .then((r) => r.json())
      .then(setTechs);
  }, []);

  return (
    <div className="ui-page">
      <div className="space-y-2">
        <h1 className="ui-title">Techs</h1>
        <p className="ui-subtitle">Simple technician list for dispatching and assignment.</p>
      </div>

      <div className="ui-card ui-card-pad max-w-2xl">
        <div className="font-medium mb-3">Technicians ({techs.length})</div>

        <div className="space-y-2">
          {techs.map((t) => (
            <div key={t.id} className="ui-item flex items-center justify-between">
              <div className="font-medium">{t.name}</div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  t.status === "Available"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {t.status}
              </span>
            </div>
          ))}

          {techs.length === 0 && <div className="ui-muted">No techs found.</div>}
        </div>
      </div>
    </div>
  );
}
