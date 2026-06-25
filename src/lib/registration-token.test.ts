import { describe, expect, it } from "vitest";

import {
  createCheckInPayload,
  createRegistrationToken,
  hashRegistrationToken,
  isRegistrationTokenValid,
} from "./registration-token";

describe("createRegistrationToken", () => {
  it("genera tokens unicos y url-safe", () => {
    const a = createRegistrationToken();
    const b = createRegistrationToken();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("hashRegistrationToken", () => {
  it("es deterministico y devuelve sha-256 en hex", () => {
    const hash = hashRegistrationToken("token-fijo");

    expect(hash).toBe(hashRegistrationToken("token-fijo"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("isRegistrationTokenValid", () => {
  it("acepta el token correcto contra su hash", () => {
    const token = createRegistrationToken();
    const hash = hashRegistrationToken(token);

    expect(isRegistrationTokenValid(token, hash)).toBe(true);
  });

  it("rechaza un token incorrecto", () => {
    const hash = hashRegistrationToken(createRegistrationToken());

    expect(isRegistrationTokenValid(createRegistrationToken(), hash)).toBe(false);
  });

  it("rechaza sin lanzar cuando el hash esperado tiene largo invalido", () => {
    const token = createRegistrationToken();

    expect(isRegistrationTokenValid(token, "abc")).toBe(false);
  });
});

describe("createCheckInPayload", () => {
  it("serializa el payload de check-in con su kind", () => {
    const payload = createCheckInPayload({
      registrationId: "reg-1",
      token: "tok-1",
    });

    expect(JSON.parse(payload)).toEqual({
      kind: "im-in-check-in",
      registrationId: "reg-1",
      token: "tok-1",
    });
  });
});
