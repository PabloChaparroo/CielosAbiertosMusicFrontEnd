import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests unitarios de lógica pura (acordes, estadísticas, mapeo de datos del backend): junto al
 * archivo que testean (`x.spec.ts`), en Node, sin React ni navegador — mismo criterio que el
 * backend. Config propia a propósito: si Vitest cargara vite.config.ts traería TanStack Start,
 * Nitro y el chequeo de Vercel, que no aplican a estos tests.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
});
