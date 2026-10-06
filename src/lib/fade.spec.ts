import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fadeVolume } from "./fade";

describe("fadeVolume", () => {
  // Node no tiene requestAnimationFrame: un cuadro cada 16ms con timers falsos
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16),
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("lleva el volumen de un valor a otro en el tiempo pedido y avisa al terminar", () => {
    const values: number[] = [];
    const done = vi.fn();
    fadeVolume(1, 0, 200, (v) => values.push(v), done);
    vi.advanceTimersByTime(100);
    expect(values.at(-1)).toBeGreaterThan(0);
    expect(values.at(-1)).toBeLessThan(1);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(values.at(-1)).toBe(0);
    expect(done).toHaveBeenCalledOnce();
  });

  it("cortado a mitad de camino, no sigue ni avisa", () => {
    const done = vi.fn();
    const cancel = fadeVolume(0, 1, 200, () => undefined, done);
    vi.advanceTimersByTime(50);
    cancel();
    vi.advanceTimersByTime(300);
    expect(done).not.toHaveBeenCalled();
  });
});
