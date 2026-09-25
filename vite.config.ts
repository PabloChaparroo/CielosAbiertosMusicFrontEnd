// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// En Vercel (que define VERCEL durante el build), sin VITE_API_URL el cliente caería en
// http://localhost:3000/api sin avisar: el deploy "sale bien" y nada funciona. Mejor que falle
// el build. VITE_* queda fija en el bundle al compilar, así que tiene que estar antes del build.
// Solo aplica en Vercel: el desarrollo local y los builds de Lovable no cambian.
if (process.env["VERCEL"] && !process.env["VITE_API_URL"]) {
  throw new Error(
    "Falta la variable de entorno VITE_API_URL en Vercel (URL del backend, terminada en /api). " +
      "Cargala en Settings → Environment Variables y volvé a deployar.",
  );
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
