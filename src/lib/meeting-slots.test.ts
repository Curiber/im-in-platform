import { describe, expect, it } from "vitest";

import {
  filterUpcomingSlots,
  generateMeetingSlots,
} from "@/lib/meeting-slots";

describe("generateMeetingSlots", () => {
  it("genera franjas de 30 minutos dentro de la ventana del evento", () => {
    const slots = generateMeetingSlots({
      eventStartsAt: "2026-08-01T12:00:00.000Z",
      eventEndsAt: "2026-08-01T13:30:00.000Z",
    });

    expect(slots).toEqual([
      {
        startsAt: "2026-08-01T12:00:00.000Z",
        endsAt: "2026-08-01T12:30:00.000Z",
      },
      {
        startsAt: "2026-08-01T12:30:00.000Z",
        endsAt: "2026-08-01T13:00:00.000Z",
      },
      {
        startsAt: "2026-08-01T13:00:00.000Z",
        endsAt: "2026-08-01T13:30:00.000Z",
      },
    ]);
  });

  it("descarta la franja parcial que se pasa del termino", () => {
    const slots = generateMeetingSlots({
      eventStartsAt: "2026-08-01T12:00:00.000Z",
      eventEndsAt: "2026-08-01T12:45:00.000Z",
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.endsAt).toBe("2026-08-01T12:30:00.000Z");
  });

  it("sin termino de evento usa la ventana de respaldo de 8 horas", () => {
    const slots = generateMeetingSlots({
      eventStartsAt: "2026-08-01T12:00:00.000Z",
      eventEndsAt: null,
    });

    expect(slots).toHaveLength(16); // 8h * 2 franjas por hora
    expect(slots.at(-1)?.endsAt).toBe("2026-08-01T20:00:00.000Z");
  });

  it("devuelve vacio con fechas invalidas o duracion no positiva", () => {
    expect(
      generateMeetingSlots({
        eventStartsAt: "no-es-fecha",
        eventEndsAt: "2026-08-01T13:00:00.000Z",
      }),
    ).toEqual([]);
    expect(
      generateMeetingSlots({
        eventStartsAt: "2026-08-01T12:00:00.000Z",
        eventEndsAt: "2026-08-01T13:00:00.000Z",
        slotMinutes: 0,
      }),
    ).toEqual([]);
  });

  it("ventana mas corta que una franja no ofrece nada", () => {
    expect(
      generateMeetingSlots({
        eventStartsAt: "2026-08-01T12:00:00.000Z",
        eventEndsAt: "2026-08-01T12:20:00.000Z",
      }),
    ).toEqual([]);
  });
});

describe("filterUpcomingSlots", () => {
  const slots = generateMeetingSlots({
    eventStartsAt: "2026-08-01T12:00:00.000Z",
    eventEndsAt: "2026-08-01T13:30:00.000Z",
  });

  it("deja solo las franjas que aun no comienzan", () => {
    const upcoming = filterUpcomingSlots(
      slots,
      new Date("2026-08-01T12:10:00.000Z"),
    );

    expect(upcoming.map((slot) => slot.startsAt)).toEqual([
      "2026-08-01T12:30:00.000Z",
      "2026-08-01T13:00:00.000Z",
    ]);
  });

  it("antes del evento no filtra nada; despues, no queda nada", () => {
    expect(
      filterUpcomingSlots(slots, new Date("2026-08-01T00:00:00.000Z")),
    ).toHaveLength(3);
    expect(
      filterUpcomingSlots(slots, new Date("2026-08-01T14:00:00.000Z")),
    ).toEqual([]);
  });
});
