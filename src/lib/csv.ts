// Utilidades de exportacion CSV con endurecimiento contra inyeccion de formulas.
// Centralizadas aqui para poder testearlas (el export del admin las consume).

// Si un valor empieza con un caracter que una planilla interpretaria como
// formula (=, +, -, @, tab, CR), se le antepone una comilla simple para
// neutralizarlo. Evita ataques de "CSV formula injection" al abrir el archivo
// en Excel/Sheets.
export function neutralizeSpreadsheetFormula(value: string) {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }

  return value;
}

// Escapa un valor para una celda CSV: neutraliza formulas y, si contiene
// comillas, comas o saltos de linea, lo envuelve en comillas duplicando las
// internas (RFC 4180).
export function escapeCsvValue(value: string | null | undefined) {
  const normalized = neutralizeSpreadsheetFormula(value ?? "");

  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}
