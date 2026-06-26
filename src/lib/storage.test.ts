import { describe, expect, it } from "vitest";

import { objectPathFromPublicUrl } from "./storage";

const BASE = "https://abc.supabase.co/storage/v1";

describe("objectPathFromPublicUrl", () => {
  it("extrae la ruta dentro del bucket", () => {
    expect(
      objectPathFromPublicUrl(
        `${BASE}/object/public/profile-photos/profiles/abc/123-x.jpg`,
        "profile-photos",
      ),
    ).toBe("profiles/abc/123-x.jpg");
  });

  it("ignora query string y fragmento", () => {
    expect(
      objectPathFromPublicUrl(
        `${BASE}/object/public/event-covers/events/e1/cover.png?token=zzz`,
        "event-covers",
      ),
    ).toBe("events/e1/cover.png");
  });

  it("decodifica caracteres url-encoded", () => {
    expect(
      objectPathFromPublicUrl(
        `${BASE}/object/public/profile-photos/profiles/a%20b/c.jpg`,
        "profile-photos",
      ),
    ).toBe("profiles/a b/c.jpg");
  });

  it("devuelve null si la URL no corresponde al bucket", () => {
    expect(
      objectPathFromPublicUrl(
        `${BASE}/object/public/profile-photos/x.jpg`,
        "event-covers",
      ),
    ).toBeNull();
  });

  it("devuelve null para url vacia, null o sin ruta", () => {
    expect(objectPathFromPublicUrl(null, "profile-photos")).toBeNull();
    expect(objectPathFromPublicUrl(undefined, "profile-photos")).toBeNull();
    expect(objectPathFromPublicUrl("", "profile-photos")).toBeNull();
    expect(
      objectPathFromPublicUrl(
        `${BASE}/object/public/profile-photos/`,
        "profile-photos",
      ),
    ).toBeNull();
  });
});
