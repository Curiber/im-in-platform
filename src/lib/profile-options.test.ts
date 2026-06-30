import { describe, expect, it } from "vitest";

import { resolveEffectiveOptions } from "@/lib/profile-options";

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
