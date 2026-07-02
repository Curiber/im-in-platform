import { describe, expect, it } from "vitest";

import { formatReportDateTime } from "@/lib/event-report";

describe("formatReportDateTime", () => {
  it("formatea en hora de Chile (verano, UTC-3), no en UTC del runtime", () => {
    // 15:00Z el 15 de enero = 12:00 en America/Santiago (DST).
    const formatted = formatReportDateTime("2026-01-15T15:00:00Z");
    expect(formatted).toContain("15 de enero de 2026");
    expect(formatted).toContain("12:00");
  });

  it("respeta el cambio a horario de invierno (UTC-4)", () => {
    // 15:00Z el 1 de julio = 11:00 en America/Santiago.
    const formatted = formatReportDateTime("2026-07-01T15:00:00Z");
    expect(formatted).toContain("11:00");
  });
});
