import { describe, expect, it } from "vitest";

import {
  formatDateTime,
  formatDateTimeRange,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from "@/lib/datetime";

describe("formatDateTime", () => {
  it("formatea en hora de Chile (verano, UTC-3), no en UTC del runtime", () => {
    expect(formatDateTime("2026-01-15T15:00:00Z")).toContain("12:00");
  });

  it("respeta el horario de invierno (UTC-4)", () => {
    expect(formatDateTime("2026-07-01T15:00:00Z")).toContain("11:00");
  });
});

describe("formatDateTimeRange", () => {
  it("muestra inicio y hora de termino", () => {
    const range = formatDateTimeRange(
      "2026-07-01T15:00:00Z",
      "2026-07-01T16:30:00Z",
    );
    expect(range).toContain("11:00");
    expect(range).toContain("12:30");
  });

  it("sin termino devuelve solo el inicio", () => {
    expect(formatDateTimeRange("2026-07-01T15:00:00Z", null)).not.toContain(
      " - ",
    );
  });
});

describe("parseDateTimeLocal", () => {
  it("interpreta la hora de pared como Chile en verano (UTC-3)", () => {
    expect(parseDateTimeLocal("2026-01-15T12:00")?.toISOString()).toBe(
      "2026-01-15T15:00:00.000Z",
    );
  });

  it("interpreta la hora de pared como Chile en invierno (UTC-4)", () => {
    expect(parseDateTimeLocal("2026-07-01T11:00")?.toISOString()).toBe(
      "2026-07-01T15:00:00.000Z",
    );
  });

  it("rechaza entradas invalidas", () => {
    expect(parseDateTimeLocal("no-es-fecha")).toBeNull();
    expect(parseDateTimeLocal("")).toBeNull();
  });
});

describe("toDateTimeLocalValue", () => {
  it("muestra la hora de pared de Chile del instante almacenado", () => {
    expect(toDateTimeLocalValue("2026-07-01T15:00:00Z")).toBe(
      "2026-07-01T11:00",
    );
  });

  it("hace round-trip exacto con parseDateTimeLocal", () => {
    for (const wall of ["2026-01-15T12:00", "2026-07-01T11:30", "2026-04-04T23:45"]) {
      const instant = parseDateTimeLocal(wall);
      expect(instant).not.toBeNull();
      expect(toDateTimeLocalValue(instant!.toISOString())).toBe(wall);
    }
  });

  it("vacio para null", () => {
    expect(toDateTimeLocalValue(null)).toBe("");
  });
});
