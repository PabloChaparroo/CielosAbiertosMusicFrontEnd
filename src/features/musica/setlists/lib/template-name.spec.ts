import { describe, expect, it } from "vitest";
import { nextTemplateName } from "./template-name";

describe("nextTemplateName — nombre automático de la lista predefinida", () => {
  it("arranca en Lista 1", () => {
    expect(nextTemplateName([])).toBe("Lista 1");
    expect(nextTemplateName(["Domingo 04/10"])).toBe("Lista 1");
  });

  it("sigue después del mayor, aunque falten números en el medio", () => {
    expect(nextTemplateName(["Lista 1", "Lista 2"])).toBe("Lista 3");
    expect(nextTemplateName(["Lista 1", "Lista 5", "Navidad"])).toBe("Lista 6");
  });
});
