import { describe, expect, it } from "vitest";

import {
  type DirectoryProfile,
  filterDirectoryProfiles,
  rankSuggestedMatches,
} from "@/lib/services/directory-service";

function profile(overrides: Partial<DirectoryProfile> = {}): DirectoryProfile {
  return {
    id: "id",
    full_name_snapshot: "Ana Perez",
    role_snapshot: "CEO",
    company_snapshot: "Acme",
    industry_snapshot: "Tecnologia",
    interests: [],
    goals_seeking: [],
    goals_offering: [],
    attendee_profiles: null,
    ...overrides,
  };
}

describe("filterDirectoryProfiles", () => {
  const profiles = [
    profile({ id: "1", full_name_snapshot: "Ana Perez", company_snapshot: "Acme" }),
    profile({
      id: "2",
      full_name_snapshot: "Bruno Soto",
      company_snapshot: "Globex",
      industry_snapshot: "Finanzas",
      interests: ["Datos"],
    }),
  ];

  it("sin filtros devuelve todos", () => {
    expect(filterDirectoryProfiles(profiles, {})).toHaveLength(2);
  });

  it("busca por nombre, cargo o empresa (case-insensitive)", () => {
    expect(filterDirectoryProfiles(profiles, { q: "acme" })).toEqual([
      profiles[0],
    ]);
    expect(filterDirectoryProfiles(profiles, { q: "BRUNO" })).toEqual([
      profiles[1],
    ]);
    expect(filterDirectoryProfiles(profiles, { q: "nadie" })).toEqual([]);
  });

  it("filtra por area y por interes", () => {
    expect(
      filterDirectoryProfiles(profiles, { industry: "Finanzas" }),
    ).toEqual([profiles[1]]);
    expect(filterDirectoryProfiles(profiles, { interest: "Datos" })).toEqual([
      profiles[1],
    ]);
  });
});

describe("rankSuggestedMatches", () => {
  const viewer = {
    goalsSeeking: ["Inversion"],
    goalsOffering: [],
    interests: ["Datos"],
    industry: null,
  };

  it("excluye al viewer, exige score > 0 y ordena por score desc", () => {
    const matches = rankSuggestedMatches(viewer, "yo", [
      profile({ id: "yo", goals_offering: ["Inversion"] }),
      profile({ id: "afin", full_name_snapshot: "Afin", interests: ["Datos"] }),
      profile({
        id: "intencion",
        full_name_snapshot: "Intencion",
        goals_offering: ["Inversion"],
      }),
      profile({ id: "nada", full_name_snapshot: "Nada" }),
    ]);

    expect(matches.map(({ profile: p }) => p.id)).toEqual([
      "intencion",
      "afin",
    ]);
  });

  it("desempata alfabeticamente y respeta el limite", () => {
    const matches = rankSuggestedMatches(
      viewer,
      "yo",
      [
        profile({ id: "b", full_name_snapshot: "Zeta", interests: ["Datos"] }),
        profile({ id: "a", full_name_snapshot: "Alfa", interests: ["Datos"] }),
      ],
      1,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.profile.id).toBe("a");
  });
});
