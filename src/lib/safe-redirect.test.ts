import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/safe-redirect";

const REQUEST_URL = "https://app.iminevents.com/auth/callback";
const FALLBACK = "/admin";

describe("safeRedirectPath", () => {
  it("acepta rutas internas simples (con y sin query)", () => {
    expect(safeRedirectPath("/mi", REQUEST_URL, FALLBACK)).toBe("/mi");
    expect(safeRedirectPath("/admin/events?tab=1", REQUEST_URL, FALLBACK)).toBe(
      "/admin/events?tab=1",
    );
  });

  it("cae al fallback con next vacio o ausente", () => {
    expect(safeRedirectPath(null, REQUEST_URL, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath(undefined, REQUEST_URL, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("", REQUEST_URL, FALLBACK)).toBe(FALLBACK);
  });

  it("rechaza open redirects que un chequeo de prefijo dejaria pasar", () => {
    // Todos resuelven a otro origen -> fallback.
    for (const evil of [
      "/\\evil.com", // backslash literal (el parser lo normaliza a //)
      "//evil.com",
      "https://evil.com",
      "http://evil.com/path",
      "https://evil.com\\@app.iminevents.com",
    ]) {
      expect(safeRedirectPath(evil, REQUEST_URL, FALLBACK)).toBe(FALLBACK);
    }
  });

  it("un backslash percent-encoded queda neutralizado en el mismo origen", () => {
    // `%5C` NO se decodifica en el path: resuelve a app.com/%5Cevil.com (un 404
    // inofensivo en nuestro dominio), nunca a evil.com.
    expect(safeRedirectPath("/%5Cevil.com", REQUEST_URL, FALLBACK)).toBe(
      "/%5Cevil.com",
    );
  });

  it("una ruta absoluta al mismo origen se reduce a su path", () => {
    expect(
      safeRedirectPath(
        "https://app.iminevents.com/mi/login",
        REQUEST_URL,
        FALLBACK,
      ),
    ).toBe("/mi/login");
  });

  it("preserva query pero no arrastra el host", () => {
    expect(
      safeRedirectPath("/e/foo/directory?registrationId=1", REQUEST_URL, FALLBACK),
    ).toBe("/e/foo/directory?registrationId=1");
  });
});
