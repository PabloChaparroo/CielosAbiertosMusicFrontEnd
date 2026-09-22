# Setup de entorno de desarrollo con un solo comando

> Guía para replicar, en un proyecto nuevo, el patrón de arranque "un solo comando" (`npm run dev`) que levanta Docker, espera la base de datos, corre migraciones y arranca la app — todo automático, multiplataforma.

---

## Idea central

Un único script de **Node puro** (no bash/PowerShell) que orquesta, en orden estricto, todo lo necesario para que un compañero nuevo pueda clonar el repo y quedar trabajando con un solo comando: `npm run dev`.

Al ser Node puro (usa `child_process`, `fs`, `dotenv`, el driver `pg`), corre igual en Windows/Mac/Linux sin mantener dos versiones del script.

---

## El script, paso a paso

Ubicación sugerida: `scripts/dev-up.cjs`, referenciado desde `package.json`:

```json
{
  "scripts": {
    "dev": "node scripts/dev-up.cjs"
  }
}
```

```javascript
async function main() {
  ensureEnvFile(); // 1
  const dbConfig = loadEnv(); // 2
  startPostgres(); // 3
  await waitForPostgres(dbConfig); // 4
  runMigrations(); // 5
  startApp(); // 6
}
```

### Paso 1 — `ensureEnvFile()`

Si no existe `.env`, lo crea copiando `.env.example` tal cual (`fs.copyFileSync`). Si ya existe, no lo toca.

**Por qué primero:** todo lo que sigue (conexión a Postgres, puertos de Docker) depende de variables de entorno — sin esto no hay nada que leer.

### Paso 2 — `loadEnv()`

Carga el `.env` con `dotenv.config()` y arma un objeto `{host, port, user, password, database}` con defaults (`localhost`, `5432`) por si alguna variable falta.

**Por qué acá:** necesita el `.env` recién garantizado en el paso 1; este objeto se reusa en el paso 4 para saber a qué host/puerto pingear.

### Paso 3 — `startPostgres()`

Corre `docker compose up -d`. Si el comando falla (código de salida ≠ 0), corta la ejecución con un mensaje explícito y accionable.

**Por qué antes de esperar:** `docker compose up -d` es asíncrono — levanta el contenedor y devuelve el control enseguida; Postgres puede tardar unos segundos en aceptar conexiones adentro. Por eso el paso siguiente es un _polling_, no una llamada bloqueante.

### Paso 4 — `waitForPostgres(dbConfig)`

Hasta 30 intentos, uno por segundo, de conectarse **de verdad** a Postgres con el driver `pg` (`new Client(dbConfig); await client.connect()`). Si conecta, sigue; si agota los intentos, corta con mensaje de troubleshooting.

**Por qué es necesario:** sin este _wait_, el paso 5 (migraciones) fallaría con "conexión rechazada" la mayoría de las veces — Postgres dentro de un contenedor recién arrancado tarda en estar listo. Es una carrera clásica _contenedor-recién-levantado_ vs. _app-que-ya-quiere-conectar_.

### Paso 5 — `runMigrations()`

Corre `npm run migration:run` (que hace build primero y corre el CLI de TypeORM contra `dist/data-source.js`). Si falla, corta y muestra el error.

**Por qué antes de levantar la app:** la app asume el schema al día; arrancarla contra una DB sin migrar rompe en el primer query. TypeORM trackea en su propia tabla `migrations` cuáles ya corrieron, así que repetir este paso en sucesivas corridas es un **no-op seguro**.

### Paso 6 — `startApp()`

Recién acá levanta `npm run start:dev` (watch mode) como proceso hijo con `stdio` heredado, para que los logs se vean en la misma terminal y `Ctrl+C` lo corte.

---

## Idempotencia

Correr el script de nuevo con todo ya levantado **no rompe nada**:

- `docker compose up -d` es no-op si el contenedor ya corre.
- `migration:run` es no-op si no hay migraciones pendientes.

Esto permite usar `npm run dev` como comando estándar de arranque diario, no solo para el setup inicial.

---

## Prerrequisitos (antes de correr el script)

- **Node** en la versión fijada del proyecto (ideal: con `.nvmrc` para que nadie use otra versión sin darse cuenta).
- **Docker Desktop** instalado **y corriendo** — no alcanza con tenerlo instalado, el ícono tiene que estar en estado "listo" (no "starting"). El script no lo arranca por vos, solo detecta si `docker compose` falla y te lo dice.
- **npm** (viene con Node) — antes de `npm run dev` hace falta `npm install` **una vez**; el script no instala dependencias, asume que `node_modules` ya existe.
- Repo clonado con su `.env.example` presente — el script lo necesita para poder crear el `.env` si falta.

---

## Orden de ejecución real (secuencia exacta)

```
1. npm install                          ← manual, una vez (fuera del script)
2. npm run dev
   ├─ 2.1  .env existe?  → no: copiar de .env.example
   ├─ 2.2  cargar variables del .env
   ├─ 2.3  docker compose up -d          (levanta TODOS los servicios del compose)
   ├─ 2.4  polling a Postgres hasta que acepte conexiones (máx 30s)
   ├─ 2.5  npm run migration:run         (build + typeorm migration:run)
   └─ 2.6  npm run start:dev             (queda corriendo en foreground, watch mode)
```

Instalación de dependencias primero → Docker después → espera activa (no timeout fijo) → migraciones → arranque de la app, **en ese orden estricto**, porque cada paso depende del anterior.

> **Nota:** aunque el nombre del script sugiera "solo Postgres", el `docker-compose.yml` real puede levantar varios servicios de una sola vez con ese mismo `docker compose up -d` (ej. Postgres, MinIO como S3 local, un SMTP de prueba tipo Mailpit, Redis para colas). Todos quedan arriba aunque el script solo haga polling explícito sobre Postgres.

---

## Variables de entorno

`.env.example` funciona como plantilla **y** como fuente para que el script cree el `.env` si falta.

```bash
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5434          # a propósito distinto del 5432 default, para no chocar
                       # con un Postgres nativo u otro proyecto ya corriendo ahí
DB_USER=<user>
DB_PASSWORD=<password>
DB_NAME=<database>

JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=15m

# Storage tipo S3 (MinIO local via docker-compose)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=<bucket>
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>
S3_FORCE_PATH_STYLE=true

# SMTP de prueba (Mailpit local via docker-compose)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_FROM=no-reply@example.local
MAIL_SECURE=false

FRONTEND_URL=http://localhost:8080

# Redis para colas
QUEUE_REDIS_HOST=127.0.0.1
QUEUE_REDIS_PORT=6379
QUEUE_REDIS_PASSWORD=
```

**Hábito a replicar:** cada variable trae, como comentario arriba, _por qué_ tiene ese valor (ej. por qué `DB_PORT` no es el 5432 default, cómo pasar de un SMTP local a uno real con app-password). El `.env.example` funciona como **documentación viva de configuración**, no solo como plantilla vacía.

El `docker-compose.yml` lee esas mismas variables con fallback (`${DB_USER:-default}`), así que Docker y la app comparten una **única fuente de verdad** (`.env`), nunca dos configuraciones separadas que puedan desincronizarse.

**Frontend:** solo necesita algo como `VITE_API_URL=/api` en su propio `.env.example` — en dev, Vite puede hacer de proxy de `/api/*` hacia el backend, así que no hace falta apuntar a una URL absoluta.

---

## Problemas comunes y cómo resolverlos

El script debería manejar estos tres casos explícitamente, con mensaje accionable (no solo un stack trace):

### 1. Docker Desktop no está corriendo

`docker compose up -d` devuelve código de error → el script corta inmediatamente con algo como:

> "¿Está Docker Desktop abierto y corriendo? Abrilo, esperá a que el ícono esté listo (no 'starting'), y volvé a correr `npm run dev`."

No sigue intentando nada más.

### 2. Puerto de Postgres ocupado

Por un Postgres nativo instalado en la máquina, u otro proyecto con Docker usando el mismo puerto → el polling agota los 30 intentos sin poder conectar → mensaje con causas posibles y comando de diagnóstico (ej. `netstat -ano | findstr <puerto>` en Windows) y sugerencia de cambiar `DB_PORT` en `.env`.

**Prevención recomendada:** elegir de entrada un puerto de Postgres **no-default** en el `docker-compose.yml`/`.env.example` (ej. `5434` en vez de `5432`) — evita el problema más común del día 1 de cualquier compañero que ya tenga Postgres instalado localmente.

### 3. Falla una migración

El script corta ahí mismo mostrando el error de TypeORM, **sin intentar levantar la app** contra un schema a medio migrar — evita enmascarar el problema real con errores secundarios confusos.

---

## Checklist para un proyecto nuevo

- [ ] Script de arranque en Node puro (no bash/PowerShell), multiplataforma.
- [ ] `.env.example` completo, con comentarios explicando el _por qué_ de cada valor no-default.
- [ ] Puerto de Postgres no-default en `docker-compose.yml` y `.env.example`.
- [ ] Polling real a la base de datos antes de migrar (nunca un `sleep` fijo).
- [ ] Mensajes de error accionables en los tres puntos de falla más comunes (Docker no corriendo, puerto ocupado, migración fallida).
- [ ] Confirmar que el script es idempotente (correrlo de nuevo con todo levantado no rompe nada).
