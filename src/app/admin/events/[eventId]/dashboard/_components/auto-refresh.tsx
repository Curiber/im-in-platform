"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Polling suave del dashboard: refresca los datos del servidor
// (`router.refresh()`) en un intervalo, sin recargar la pagina. Togglable, para
// no consumir datos cuando no se necesita. Se prefiere polling a Realtime por
// simplicidad (el spec lo permite explicitamente).
const INTERVAL_MS = 15_000;

export function AutoRefresh() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const id = setInterval(() => {
      router.refresh();
      setRefreshedAt(new Date());
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [enabled, router]);

  return (
    <div className="flex items-center gap-3">
      {refreshedAt ? (
        <span className="text-xs text-brand-slate-600">
          Actualizado{" "}
          {refreshedAt.toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      ) : null}
      <button
        aria-pressed={enabled}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
          enabled
            ? "border-brand-cyan-500 bg-brand-mint-300/30 text-brand-navy-950"
            : "border-brand-border bg-white text-brand-slate-600 hover:bg-brand-surface-soft"
        }`}
        onClick={() => setEnabled((value) => !value)}
        type="button"
      >
        <RefreshCw
          className={`size-4 ${enabled ? "text-brand-cyan-500" : ""}`}
          aria-hidden="true"
        />
        {enabled ? "Auto-actualizar activo" : "Auto-actualizar en pausa"}
      </button>
    </div>
  );
}
