import { describe, expect, it } from "vitest";
import { looksLikeYoutube, parseYoutubeVideoId } from "./youtube";

const ID = "pORjEfnPALk";

describe("parseYoutubeVideoId", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}`,
    `youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc123`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=share`,
    `  ${ID}  `,
  ])("%s → ID", (input) => {
    expect(parseYoutubeVideoId(input)).toBe(ID);
  });

  it("acepta IDs con - y _ (son válidos en YouTube)", () => {
    expect(parseYoutubeVideoId("https://youtu.be/a-B_c1D2e3F")).toBe("a-B_c1D2e3F");
  });

  it.each([
    "",
    "no es un link",
    "https://www.youtube.com/watch?v=corto",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/@CanalDeAlguien",
    `https://vimeo.com/watch?v=${ID}`,
    `https://evil.com/youtube.com/watch?v=${ID}`,
    `https://drive.google.com/file/d/${ID}`,
  ])("%s → null (roto o de otro sitio)", (input) => {
    expect(parseYoutubeVideoId(input)).toBeNull();
  });
});

describe("looksLikeYoutube", () => {
  it("detecta links de YouTube aunque estén rotos, y no los de otros sitios", () => {
    expect(looksLikeYoutube("https://www.youtube.com/watch?v=roto")).toBe(true);
    expect(looksLikeYoutube("youtu.be/x")).toBe(true);
    expect(looksLikeYoutube("https://drive.google.com/abc")).toBe(false);
  });
});
