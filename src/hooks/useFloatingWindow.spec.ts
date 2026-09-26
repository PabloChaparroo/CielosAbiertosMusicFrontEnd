import { describe, expect, it } from "vitest";
import { clampToViewport, FLOAT_MARGIN } from "./useFloatingWindow";

const size = { width: 260, height: 232 };
const phone = { width: 390, height: 844 };

describe("clampToViewport", () => {
  it("deja igual una posición que ya está adentro", () => {
    expect(clampToViewport({ x: 50, y: 300 }, size, phone)).toEqual({ x: 50, y: 300 });
  });

  it("no deja salir por la izquierda ni por arriba", () => {
    expect(clampToViewport({ x: -500, y: -80 }, size, phone)).toEqual({
      x: FLOAT_MARGIN,
      y: FLOAT_MARGIN,
    });
  });

  it("no deja salir por la derecha ni por abajo", () => {
    expect(clampToViewport({ x: 9999, y: 9999 }, size, phone)).toEqual({
      x: 390 - 260 - FLOAT_MARGIN,
      y: 844 - 232 - FLOAT_MARGIN,
    });
  });

  it("si la ventanita es más ancha que la pantalla, queda pegada al margen izquierdo", () => {
    expect(clampToViewport({ x: 100, y: 10 }, { width: 500, height: 300 }, phone).x).toBe(
      FLOAT_MARGIN,
    );
  });
});
