"use client";

import { Printer } from "lucide-react";

// Descargar = imprimir a PDF desde el navegador (sin dependencias de generacion
// de PDF en el servidor). El resumen queda como documento portable.
export function PrintButton() {
  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
      onClick={() => window.print()}
      type="button"
    >
      <Printer className="size-4" aria-hidden="true" />
      Imprimir / Guardar PDF
    </button>
  );
}
