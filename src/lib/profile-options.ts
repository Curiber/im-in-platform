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

// Objetivos de networking (busco/ofrezco). Un solo catalogo para ambas
// facetas: que "Inversion" signifique lo mismo al buscar y al ofrecer es lo
// que permite cruzar A.busca con B.ofrece en el matchmaking.
export const DEFAULT_GOALS = [
  "Inversion",
  "Clientes",
  "Talento",
  "Empleo",
  "Socios / alianzas",
  "Mentoria",
  "Proveedores",
  "Visibilidad",
  "Aprender",
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

export type ProfileSelections = {
  industry: string;
  interests: string[];
  goalsSeeking: string[];
  goalsOffering: string[];
};

export type EffectiveCatalog = {
  industries: string[];
  interests: string[];
  goals: string[];
};

// Validacion server-side de lo que envia el asistente contra el catalogo
// efectivo del evento. Los Server Actions (y la futura API) son invocables
// directo, asi que no se confia en el formulario. Pura para testearla aislada;
// la comparten registro, perfil y API v1.
export function validateProfileSelections(
  catalog: EffectiveCatalog,
  selections: ProfileSelections,
): boolean {
  const allowedInterests = new Set(catalog.interests);
  const allowedGoals = new Set(catalog.goals);

  return (
    catalog.industries.includes(selections.industry) &&
    selections.interests.every((item) => allowedInterests.has(item)) &&
    [...selections.goalsSeeking, ...selections.goalsOffering].every((item) =>
      allowedGoals.has(item),
    )
  );
}
