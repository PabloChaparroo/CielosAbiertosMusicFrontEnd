import { describe, expect, it } from "vitest";
import { isAssignable } from "./assignable";
import { isDateTitle, titleForDate } from "./date-title";
import { isPlayed, toLocalInput } from "./setlist-status";

describe("isPlayed — cuándo una lista ya se tocó", () => {
  const domingo = new Date(2026, 9, 25, 10, 30).toISOString();
  it("el mismo día sigue editable (hasta la noche)", () => {
    expect(isPlayed(domingo, new Date(2026, 9, 25, 23, 59))).toBe(false);
  });
  it("desde el día siguiente ya se tocó", () => {
    expect(isPlayed(domingo, new Date(2026, 9, 26, 0, 1))).toBe(true);
  });
  it("una fecha futura no se tocó", () => {
    expect(isPlayed(domingo, new Date(2026, 9, 20))).toBe(false);
  });
});

describe("toLocalInput", () => {
  it("fecha ISO → valor del input en hora local", () => {
    expect(toLocalInput(new Date(2026, 9, 25, 10, 30).toISOString())).toBe("2026-10-25T10:30");
  });
});

describe("título con fecha", () => {
  it("titleForDate e isDateTitle", () => {
    expect(titleForDate("2026-10-25T10:30")).toBe("Domingo 25/10");
    expect(isDateTitle("Domingo 25/10")).toBe(true);
    expect(isDateTitle("Santa Cena")).toBe(false);
  });
});

describe("isAssignable", () => {
  const role = (name: string) => [{ name }] as never;
  it("líderes y músicos activos sí; admins y dados de baja no", () => {
    expect(isAssignable({ roles: role("Líder"), isAdmin: false })).toBe(true);
    expect(isAssignable({ roles: role("Músico"), isAdmin: false })).toBe(true);
    expect(isAssignable({ roles: role("Líder"), isAdmin: true })).toBe(false);
    expect(isAssignable({ roles: role("Admin"), isAdmin: false })).toBe(false);
    expect(
      isAssignable({ roles: role("Músico"), isAdmin: false, fechaHoraBaja: "2026-01-01" }),
    ).toBe(false);
  });
});
