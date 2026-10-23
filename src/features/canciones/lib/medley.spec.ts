import { describe, expect, it } from "vitest";
import { medleyFromDuration } from "./medley";

describe("medleyFromDuration — alabanza de más de 10 minutos", () => {
  it("más de 10 minutos es enganchado; 10 justos o menos, no", () => {
    expect(medleyFromDuration("Alabanza", 601)).toBe(true);
    expect(medleyFromDuration("Alabanza", 600)).toBe(false);
    expect(medleyFromDuration("Alabanza", 240)).toBe(false);
  });
  it("las adoraciones nunca son enganchado, por larga que sea", () => {
    expect(medleyFromDuration("Adoración", 13 * 60)).toBe(false);
  });
  it("sin duración no se puede saber", () => {
    expect(medleyFromDuration("Alabanza", null)).toBeNull();
  });
});
