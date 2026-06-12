import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createRegistrationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashRegistrationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isRegistrationTokenValid(token: string, expectedHash: string) {
  const actualHash = hashRegistrationToken(token);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createCheckInPayload({
  registrationId,
  token,
}: {
  registrationId: string;
  token: string;
}) {
  return JSON.stringify({
    kind: "im-in-check-in",
    registrationId,
    token,
  });
}
