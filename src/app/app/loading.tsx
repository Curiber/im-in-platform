// Skeleton de carga para el segmento /app (spec 37). Las paginas son
// force-dynamic y consultan la base; sin este boundary, al navegar entre
// pestañas la anterior queda congelada hasta que la nueva termina de cargar.
// La navegacion (AppNav) vive en el layout y se mantiene visible; esto solo
// reemplaza el area de contenido con un placeholder neutro mientras carga.
const CARD_KEYS = ["a", "b", "c", "d", "e", "f"];

export default function AppLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8"
    >
      <div className="h-8 w-56 max-w-full animate-pulse rounded-lg bg-brand-slate-100" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-brand-slate-100" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_KEYS.map((key) => (
          <div
            className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm"
            key={key}
          >
            <div className="h-5 w-3/4 animate-pulse rounded bg-brand-slate-100" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-brand-slate-100" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-brand-slate-100" />
            <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-brand-slate-100" />
          </div>
        ))}
      </div>

      <span className="sr-only">Cargando…</span>
    </main>
  );
}
