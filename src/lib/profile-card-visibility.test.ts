import { describe, expect, it } from "vitest";

import {
  canShowPublicEmail,
  canShowPublicPhone,
  isProfileCardPublic,
  type ProfileCardVisibility,
} from "./profile-card-visibility";

function profile(
  visibility: ProfileCardVisibility,
  email = true,
  phone = true,
) {
  return {
    card_visibility: visibility,
    public_email_enabled: email,
    public_phone_enabled: phone,
  };
}

describe("isProfileCardPublic", () => {
  it("es publica salvo cuando es private", () => {
    expect(isProfileCardPublic(profile("private"))).toBe(false);
    expect(isProfileCardPublic(profile("public_limited"))).toBe(true);
    expect(isProfileCardPublic(profile("public_full"))).toBe(true);
  });
});

describe("canShowPublicEmail / canShowPublicPhone", () => {
  it("solo expone contacto en public_full con el flag por campo activo", () => {
    expect(canShowPublicEmail(profile("public_full", true))).toBe(true);
    expect(canShowPublicPhone(profile("public_full", true, true))).toBe(true);
  });

  it("no expone contacto en private ni public_limited aunque el flag este activo", () => {
    expect(canShowPublicEmail(profile("private", true))).toBe(false);
    expect(canShowPublicEmail(profile("public_limited", true))).toBe(false);
    expect(canShowPublicPhone(profile("public_limited", true, true))).toBe(false);
  });

  it("no expone contacto si el flag por campo esta desactivado", () => {
    expect(canShowPublicEmail(profile("public_full", false))).toBe(false);
    expect(canShowPublicPhone(profile("public_full", true, false))).toBe(false);
  });
});
