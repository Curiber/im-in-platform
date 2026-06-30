// Opciones por defecto de plataforma. Son el fallback cuando un evento no tiene
// un catalogo propio en `event_profile_options` (ver event-profile-options.ts).

export const DEFAULT_INDUSTRIES = [
  "Educacion",
  "Tecnologia",
  "Innovacion",
  "Finanzas",
  "Marketing",
  "Operaciones",
  "Sostenibilidad",
  "Emprendimiento",
  "Consultoria",
  "Otro",
];

export const DEFAULT_INTERESTS = [
  "Liderazgo",
  "Innovacion",
  "Datos",
  "Emprendimiento",
  "Impacto social",
  "Finanzas",
  "Marketing",
  "Tecnologia",
  "Talento",
  "Internacional",
];

// Resolucion del catalogo efectivo: si el evento tiene opciones personalizadas
// se usan esas; si no, los defaults de plataforma. Puro (sin DB) para testear la
// regla de fallback de forma aislada.
export function resolveEffectiveOptions(
  customLabels: string[],
  defaults: string[],
): string[] {
  return customLabels.length > 0 ? customLabels : defaults;
}
