import { describe, expect, it } from "vitest";
import { hasSequence } from "./sequence";

describe("hasSequence — al menos un audio cargado", () => {
  it("cuenta el audio principal o las pistas; un link solo no", () => {
    expect(hasSequence({ audioKey: "audios/a.mp3", trackCount: 0 })).toBe(true);
    expect(hasSequence({ audioKey: null, trackCount: 2 })).toBe(true);
    expect(hasSequence({ audioKey: null, trackCount: 0 })).toBe(false);
  });
});
