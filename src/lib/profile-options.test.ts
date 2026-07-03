import { describe, expect, it } from "vitest";

import {
  resolveEffectiveOptions,
  validateProfileSelections,
} from "@/lib/profile-options";

describe("resolveEffectiveOptions", () => {
  const defaults = ["A", "B", "C"];

  it("usa los defaults cuando no hay opciones personalizadas", () => {
    expect(resolveEffectiveOptions([], defaults)).toEqual(defaults);
  });

  it("usa las opciones personalizadas cuando existen", () => {
    expect(resolveEffectiveOptions(["X", "Y"], defaults)).toEqual(["X", "Y"]);
  });

  it("una sola opcion personalizada reemplaza por completo los defaults", () => {
    expect(resolveEffectiveOptions(["Solo"], defaults)).toEqual(["Solo"]);
  });
});

describe("validateProfileSelections", () => {
  const catalog = {
    industries: ["Tecnologia", "Finanzas"],
    interests: ["Datos", "Liderazgo"],
    goals: ["Inversion", "Clientes"],
  };

  it("acepta selecciones dentro del catalogo (goals opcionales)", () => {
    expect(
      validateProfileSelections(catalog, {
        industry: "Tecnologia",
        interests: ["Datos"],
        goalsSeeking: ["Inversion"],
        goalsOffering: [],
      }),
    ).toBe(true);
    expect(
      validateProfileSelections(catalog, {
        industry: "Finanzas",
        interests: ["Datos", "Liderazgo"],
        goalsSeeking: [],
        goalsOffering: [],
      }),
    ).toBe(true);
  });

  it("rechaza industria fuera del catalogo", () => {
    expect(
      validateProfileSelections(catalog, {
        industry: "Otra",
        interests: ["Datos"],
        goalsSeeking: [],
        goalsOffering: [],
      }),
    ).toBe(false);
  });

  it("rechaza un interes o un objetivo fuera del catalogo", () => {
    expect(
      validateProfileSelections(catalog, {
        industry: "Tecnologia",
        interests: ["Datos", "Inventado"],
        goalsSeeking: [],
        goalsOffering: [],
      }),
    ).toBe(false);
    expect(
      validateProfileSelections(catalog, {
        industry: "Tecnologia",
        interests: ["Datos"],
        goalsSeeking: [],
        goalsOffering: ["Inventado"],
      }),
    ).toBe(false);
  });
});
