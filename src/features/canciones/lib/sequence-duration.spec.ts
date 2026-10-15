import { describe, expect, it } from "vitest";
import { formatListDuration, youtubeDuration } from "./sequence-duration";

describe("formatListDuration — duración total de una lista", () => {
  it("en minutos, y con horas desde 60 minutos", () => {
    expect(formatListDuration(1110)).toBe("19 min");
    expect(formatListDuration(4020)).toBe("1 h 07 min");
    expect(formatListDuration(3600)).toBe("1 h 00 min");
  });
});

describe("youtubeDuration — respaldo cuando la canción no tiene audio", () => {
  it("la duración del video si tiene video y duración cargada; si no, null", () => {
    expect(youtubeDuration({ youtubeVideoId: "abc", duration: 245 })).toBe(245);
    expect(youtubeDuration({ youtubeVideoId: "abc", duration: 0 })).toBeNull();
    expect(youtubeDuration({ youtubeVideoId: null, duration: 245 })).toBeNull();
  });
});
