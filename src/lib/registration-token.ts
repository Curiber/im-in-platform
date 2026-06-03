import { createHash, randomBytes } from "node:crypto";

export function createRegistrationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashRegistrationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
