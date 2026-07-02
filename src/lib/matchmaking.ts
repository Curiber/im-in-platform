// Matchmaking score v1 (Fase 4.1, spec 26). Puro (sin DB) para testear la
// regla de forma aislada.
//
// El match por intencion pesa mas que la afinidad (spec 12 §B.1): cruzar lo
// que el viewer BUSCA con lo que el candidato OFRECE (y viceversa) vale 3x lo
// que un interes en comun. No se muestra porcentaje ni "IA" (spec 15): el
// score solo ordena y las razones explican el match con datos reales.

export type MatchProfile = {
  goalsSeeking: string[];
  goalsOffering: string[];
  interests: string[];
  industry: string | null;
};

export type MatchReason =
  | { type: "offers_what_you_seek"; labels: string[] }
  | { type: "seeks_what_you_offer"; labels: string[] }
  | { type: "shared_interests"; labels: string[] }
  | { type: "same_industry"; label: string };

export type MatchResult = {
  score: number;
  reasons: MatchReason[];
};

const INTENT_WEIGHT = 3;
const INTEREST_WEIGHT = 1;
const INDUSTRY_WEIGHT = 1;

export function scoreMatch(
  viewer: MatchProfile,
  candidate: MatchProfile,
): MatchResult {
  const offersWhatYouSeek = intersect(viewer.goalsSeeking, candidate.goalsOffering);
  const seeksWhatYouOffer = intersect(candidate.goalsSeeking, viewer.goalsOffering);
  const sharedInterests = intersect(viewer.interests, candidate.interests);
  const sameIndustry = Boolean(
    viewer.industry && candidate.industry && viewer.industry === candidate.industry,
  );

  const score =
    INTENT_WEIGHT * (offersWhatYouSeek.length + seeksWhatYouOffer.length) +
    INTEREST_WEIGHT * sharedInterests.length +
    (sameIndustry ? INDUSTRY_WEIGHT : 0);

  // Las razones van de la mas fuerte a la mas debil: es el orden en que la UI
  // las muestra como chips.
  const reasons: MatchReason[] = [];

  if (offersWhatYouSeek.length) {
    reasons.push({ type: "offers_what_you_seek", labels: offersWhatYouSeek });
  }

  if (seeksWhatYouOffer.length) {
    reasons.push({ type: "seeks_what_you_offer", labels: seeksWhatYouOffer });
  }

  if (sharedInterests.length) {
    reasons.push({ type: "shared_interests", labels: sharedInterests });
  }

  if (sameIndustry && viewer.industry) {
    reasons.push({ type: "same_industry", label: viewer.industry });
  }

  return { score, reasons };
}

// Traduce las razones tipadas del score a texto visible. Razones concretas y
// verificables, nunca un porcentaje inventado (spec 15).
export function formatMatchReason(reason: MatchReason): string {
  switch (reason.type) {
    case "offers_what_you_seek":
      return `Ofrece lo que buscas: ${reason.labels.join(", ")}`;
    case "seeks_what_you_offer":
      return `Busca lo que ofreces: ${reason.labels.join(", ")}`;
    case "shared_interests":
      return reason.labels.length === 1
        ? "1 interes en comun"
        : `${reason.labels.length} intereses en comun`;
    case "same_industry":
      return `Misma area: ${reason.label}`;
  }
}

// Interseccion conservando el orden de la primera lista y sin duplicados.
function intersect(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  return Array.from(new Set(a)).filter((item) => bSet.has(item));
}
