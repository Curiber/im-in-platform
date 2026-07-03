import { describe, expect, it } from "vitest";

import { evaluateVerificationEligibility } from "@/lib/services/verification-service";

const NOW = new Date("2026-08-01T12:00:00.000Z");

function args(overrides: Partial<Parameters<typeof evaluateVerificationEligibility>[0]> = {}) {
  return {
    eventEndsAt: "2026-08-02T00:00:00.000Z",
    now: NOW,
    registeredAt: "2026-08-01T10:00:00.000Z",
    status: "pending_verification",
    ...overrides,
  };
}

describe("evaluateVerificationEligibility", () => {
  it("una inscripcion pendiente, vigente y con evento abierto es verificable", () => {
    expect(evaluateVerificationEligibility(args())).toBe("verifiable");
  });

  it("registered/checked_in/pending_approval son idempotentes (already_active)", () => {
    for (const status of ["registered", "checked_in", "pending_approval"]) {
      expect(evaluateVerificationEligibility(args({ status }))).toBe(
        "already_active",
      );
    }
  });

  it("la idempotencia gana aunque el evento haya terminado o el link este vencido", () => {
    expect(
      evaluateVerificationEligibility(
        args({
          status: "registered",
          eventEndsAt: "2026-07-01T00:00:00.000Z",
          registeredAt: "2026-06-01T00:00:00.000Z",
        }),
      ),
    ).toBe("already_active");
  });

  it("cancelled/no_show no son verificables", () => {
    for (const status of ["cancelled", "no_show"]) {
      expect(evaluateVerificationEligibility(args({ status }))).toBe("invalid");
    }
  });

  it("evento terminado: invalido", () => {
    expect(
      evaluateVerificationEligibility(
        args({ eventEndsAt: "2026-08-01T11:59:00.000Z" }),
      ),
    ).toBe("invalid");
  });

  it("sin termino de evento no aplica esa regla", () => {
    expect(
      evaluateVerificationEligibility(args({ eventEndsAt: null })),
    ).toBe("verifiable");
  });

  it("link vencido (mas de 24h desde la inscripcion): invalido", () => {
    expect(
      evaluateVerificationEligibility(
        args({ registeredAt: "2026-07-31T11:59:00.000Z" }),
      ),
    ).toBe("invalid");
    // Justo dentro de la ventana sigue siendo valido.
    expect(
      evaluateVerificationEligibility(
        args({ registeredAt: "2026-07-31T12:01:00.000Z" }),
      ),
    ).toBe("verifiable");
  });
});
