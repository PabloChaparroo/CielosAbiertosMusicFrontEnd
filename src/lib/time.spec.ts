import { describe, expect, it } from "vitest";
import { formatTime, parseTime, validateLoop } from "./time";

describe("parseTime / formatTime", () => {
  it.each([
    ["3:45", 225],
    ["0:05", 5],
    ["225", 225],
    ["1:02:05", 3725],
    [" 4:20 ", 260],
  ])("%s → %i", (text, seconds) => expect(parseTime(text)).toBe(seconds));

  it.each(["", "3:", "3:75", "abc", "-1", "3.5"])("%j no es un tiempo", (text) =>
    expect(parseTime(text)).toBeNull(),
  );

  it("formatTime", () => {
    expect(formatTime(225)).toBe("3:45");
    expect(formatTime(5.9)).toBe("0:05");
    expect(formatTime(-3)).toBe("0:00");
  });
});

describe("validateLoop", () => {
  it("el solo de 3:45 a 4:20", () => {
    expect(validateLoop("3:45", "4:20", 300)).toEqual({ loop: { start: 225, end: 260 } });
  });

  it("'hasta' pasado el final se recorta al final", () => {
    expect(validateLoop("4:50", "6:00", 300)).toEqual({ loop: { start: 290, end: 300 } });
  });

  it("errores", () => {
    expect(validateLoop("4:20", "3:45", 300)).toHaveProperty("error");
    expect(validateLoop("3:45", "3:45", 300)).toHaveProperty("error");
    expect(validateLoop("6:00", "6:30", 300)).toHaveProperty("error");
    expect(validateLoop("tres", "4:20", 300)).toHaveProperty("error");
  });
});
