import { describe, expect, it } from "vitest";

import { type MatchProfile, scoreMatch } from "@/lib/matchmaking";

function profile(overrides: Partial<MatchProfile> = {}): MatchProfile {
  return {
    goalsSeeking: [],
    goalsOffering: [],
    interests: [],
    industry: null,
    ...overrides,
  };
}

describe("scoreMatch", () => {
  it("devuelve score 0 y sin razones cuando no hay datos en comun", () => {
    const result = scoreMatch(
      profile({ goalsSeeking: ["Inversion"], interests: ["Datos"] }),
      profile({ goalsOffering: ["Mentoria"], interests: ["Talento"] }),
    );

    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("puntua 3 por cada cruce busco -> ofrece", () => {
    const result = scoreMatch(
      profile({ goalsSeeking: ["Inversion", "Clientes"] }),
      profile({ goalsOffering: ["Inversion", "Clientes", "Mentoria"] }),
    );

    expect(result.score).toBe(6);
    expect(result.reasons).toEqual([
      { type: "offers_what_you_seek", labels: ["Inversion", "Clientes"] },
    ]);
  });

  it("puntua 3 por cada cruce ofrezco -> busca (direccion inversa)", () => {
    const result = scoreMatch(
      profile({ goalsOffering: ["Talento"] }),
      profile({ goalsSeeking: ["Talento"] }),
    );

    expect(result.score).toBe(3);
    expect(result.reasons).toEqual([
      { type: "seeks_what_you_offer", labels: ["Talento"] },
    ]);
  });

  it("los cruces de intencion pesan mas que los intereses", () => {
    const intent = scoreMatch(
      profile({ goalsSeeking: ["Inversion"] }),
      profile({ goalsOffering: ["Inversion"] }),
    );
    const affinity = scoreMatch(
      profile({ interests: ["Datos", "Liderazgo"] }),
      profile({ interests: ["Datos", "Liderazgo"] }),
    );

    expect(intent.score).toBeGreaterThan(affinity.score);
  });

  it("suma 1 por interes en comun y 1 por misma industria", () => {
    const result = scoreMatch(
      profile({ interests: ["Datos", "Marketing"], industry: "Tecnologia" }),
      profile({ interests: ["Datos"], industry: "Tecnologia" }),
    );

    expect(result.score).toBe(2);
    expect(result.reasons).toEqual([
      { type: "shared_interests", labels: ["Datos"] },
      { type: "same_industry", label: "Tecnologia" },
    ]);
  });

  it("no cuenta industria cuando alguna es null", () => {
    const result = scoreMatch(
      profile({ industry: null }),
      profile({ industry: null }),
    );

    expect(result.score).toBe(0);
  });

  it("combina todas las señales y ordena las razones de fuerte a debil", () => {
    const result = scoreMatch(
      profile({
        goalsSeeking: ["Inversion"],
        goalsOffering: ["Mentoria"],
        interests: ["Datos"],
        industry: "Finanzas",
      }),
      profile({
        goalsSeeking: ["Mentoria"],
        goalsOffering: ["Inversion"],
        interests: ["Datos"],
        industry: "Finanzas",
      }),
    );

    // 3 (busco->ofrece) + 3 (ofrezco->busca) + 1 (interes) + 1 (industria).
    expect(result.score).toBe(8);
    expect(result.reasons.map((reason) => reason.type)).toEqual([
      "offers_what_you_seek",
      "seeks_what_you_offer",
      "shared_interests",
      "same_industry",
    ]);
  });

  it("ignora duplicados dentro de una misma lista", () => {
    const result = scoreMatch(
      profile({ goalsSeeking: ["Inversion", "Inversion"] }),
      profile({ goalsOffering: ["Inversion"] }),
    );

    expect(result.score).toBe(3);
  });
});
