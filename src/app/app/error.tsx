"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

// Error boundary del segmento /app (spec 37). Si una carga de datos falla (un
// blip de red, la base momentaneamente no disponible), el asistente ve un estado
// claro con opcion de reintentar en vez de la pantalla de error cruda. La
// navegacion (AppNav) vive en el layout y se mantiene visible.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en /app:", error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
      <div className="rounded-2xl border border-brand-border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-brand-navy-950">
          Algo salio mal
        </h1>
        <p className="mt-2 text-sm leading-6 text-brand-slate-600">
          No pudimos cargar esta seccion. Puede ser algo momentaneo; intentalo de
          nuevo en unos segundos.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
            onClick={reset}
            type="button"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Reintentar
          </button>
          <Link
            className="inline-flex h-11 items-center rounded-md border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
            href="/app"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
