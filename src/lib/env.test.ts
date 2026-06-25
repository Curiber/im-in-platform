import { afterEach, describe, expect, it, vi } from "vitest";

import { assertProductionEnv, getAppUrl } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppUrl", () => {
  it("devuelve APP_URL sin barra final cuando esta configurada", () => {
    vi.stubEnv("APP_URL", "https://app.imin.cl/");

    expect(getAppUrl()).toBe("https://app.imin.cl");
  });

  it("usa localhost como fallback en desarrollo sin APP_URL", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("lanza en produccion si APP_URL no es una URL valida", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => getAppUrl()).toThrow(/APP_URL/);
  });
});

describe("assertProductionEnv", () => {
  it("es un no-op fuera de produccion aunque falte todo", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("EMAIL_PROVIDER_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");

    expect(() => assertProductionEnv()).not.toThrow();
  });

  it("lanza en produccion nombrando las vars faltantes", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://app.imin.cl");
    vi.stubEnv("EMAIL_PROVIDER_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");

    expect(() => assertProductionEnv()).toThrow(/EMAIL_PROVIDER_API_KEY/);
    expect(() => assertProductionEnv()).toThrow(/EMAIL_FROM/);
  });

  it("lanza en produccion si EMAIL_FROM no es un email valido", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://app.imin.cl");
    vi.stubEnv("EMAIL_PROVIDER_API_KEY", "re_123");
    vi.stubEnv("EMAIL_FROM", "no-es-email");

    expect(() => assertProductionEnv()).toThrow(/EMAIL_FROM/);
  });

  it("pasa en produccion con la configuracion completa", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://app.imin.cl");
    vi.stubEnv("EMAIL_PROVIDER_API_KEY", "re_123");
    vi.stubEnv("EMAIL_FROM", "hola@imin.cl");

    expect(() => assertProductionEnv()).not.toThrow();
  });
});
