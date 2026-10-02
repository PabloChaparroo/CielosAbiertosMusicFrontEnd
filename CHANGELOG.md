# Changelog

## 2026-10-02

### Seguridad

- **CVE-2026-102989 / GHSA-qx66-fv34-fjm8** — XSS reflejado crítico (CVSS 9.3) en el manejo de respuestas de server functions de TanStack Start (afecta `>=1.143.12 <1.168.60`). Vercel bloqueaba el deploy de `develop` por este paquete.
  - `@tanstack/react-start` 1.168.32 → **1.168.60** (trae `@tanstack/start-server-core` 1.169.39)
  - `@tanstack/react-router` 1.170.18 → **1.170.41** (versión exacta que fija `react-start@1.168.60`)
  - `@tanstack/router-plugin` 1.168.23 → **1.168.42** (versión exacta que fija `start-plugin-core@1.171.49`)
  - Una sola copia de cada paquete del router en `package-lock.json` y `bun.lock`.
  - Ajuste por cambio de API: `ErrorComponentProps.error` ahora es `unknown`; el `errorComponent` raíz usa el tipo oficial.
