import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppUrl } from "./env";

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
