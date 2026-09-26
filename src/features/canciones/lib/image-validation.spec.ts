import { describe, expect, it } from "vitest";
import { MAX_COVER_BYTES, MAX_IMAGE_BYTES, validateImageFile } from "./image-validation";

const MB = 1024 * 1024;
/** File falso con el tamaño pedido sin reservar la memoria */
function fakeFile(type: string, size: number): File {
  const file = new File([""], "archivo", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateImageFile", () => {
  it("la foto de letra sigue en 8MB (tope por defecto)", () => {
    expect(MAX_IMAGE_BYTES).toBe(8 * MB);
    expect(validateImageFile(fakeFile("image/jpeg", 7 * MB))).toBeNull();
    expect(validateImageFile(fakeFile("image/jpeg", 9 * MB))).toBe(
      "La imagen supera el límite de 8MB.",
    );
  });

  it("portada: tope de 5MB", () => {
    expect(MAX_COVER_BYTES).toBe(5 * MB);
    expect(validateImageFile(fakeFile("image/png", 4 * MB), MAX_COVER_BYTES)).toBeNull();
    expect(validateImageFile(fakeFile("image/png", 6 * MB), MAX_COVER_BYTES)).toBe(
      "La imagen supera el límite de 5MB.",
    );
  });

  it("acepta jpg, png y webp; rechaza HEIC y archivos que no son imagen", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImageFile(fakeFile(type, MB), MAX_COVER_BYTES)).toBeNull();
    }
    for (const type of ["image/heic", "text/plain", "application/pdf", ""]) {
      expect(validateImageFile(fakeFile(type, MB), MAX_COVER_BYTES)).toBe(
        "Formato no soportado — subí una imagen jpg, png o webp.",
      );
    }
  });
});
