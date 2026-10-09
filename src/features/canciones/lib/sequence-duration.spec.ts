import { describe, expect, it } from "vitest";
import { formatListDuration } from "./sequence-duration";

describe("formatListDuration — duración total de una lista", () => {
  it("en minutos, y con horas desde 60 minutos", () => {
    expect(formatListDuration(1110)).toBe("19 min");
    expect(formatListDuration(4020)).toBe("1 h 07 min");
    expect(formatListDuration(3600)).toBe("1 h 00 min");
  });
});
