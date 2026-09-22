# Plantilla de arquitectura — NestJS + TypeORM + Postgres / React + TanStack Start

> Patrones extraídos de un proyecto real en producción, generalizados sin nombres de entidades específicas. Sirve como punto de partida al arrancar un repo nuevo con este mismo stack.

---

## 1. Stack tecnológico

### Backend

- **Node** `^22.22.3 || >=24.15.0` (fijado en `.nvmrc`), `"type": "module"` (ESM nativo)
- **NestJS** `^12` (common/core/platform-express, config, jwt, passport, swagger, terminus para healthchecks, bullmq para colas)
- **TypeORM** `^0.3.x` + `typeorm-naming-strategies` (SnakeNamingStrategy) + driver `pg`
- **decimal.js** — cálculos monetarios exactos, nunca `float`/aritmética nativa de JS
- **class-validator** + **class-transformer** — validación de DTOs
- **passport-jwt** + **bcrypt** — auth
- **pdfmake** — generación de PDFs server-side (ej. comprobantes)
- **@aws-sdk/client-s3** + **@aws-sdk/s3-request-presigner** — storage vía URLs firmadas (S3/MinIO)
- **joi** — validación de variables de entorno
- Build con **SWC** (no `tsc` para build), lint/format con **oxlint/oxfmt** (no ESLint/Prettier), tests con **Vitest** (no Jest) en configs separadas (unit / e2e)

### Frontend

- **React** `^19` + **TypeScript** `^5.8`
- **TanStack Start** `^1.167` + **Router** `^1.168` + **Query** `^5.83` — SSR-capable, file-based routing
- **Tailwind CSS** `^4` + **Vite** `^7`
- **shadcn/ui** sobre **Radix** (`@radix-ui/react-*`) + `class-variance-authority` + `tailwind-merge` + `lucide-react`
- **Formik** `^2.4` + **Yup** `^1.7` para formularios (o `react-hook-form` + `zod` si se prefiere ese ecosistema)
- **decimal.js** también en el frontend — replica exactamente la misma configuración de precisión/redondeo que el backend, para que el preview que ve el usuario coincida con lo que se persiste
- Sin suite de tests automatizada por decisión consciente (ver sección 5)

### Razón documentada de decisiones clave

Vive en comentarios in-situ y en el documento de estado vivo (sección 6), no en un README aparte:

- `decimal.js` porque "el equivalente monetario es un snapshot contable", no aritmética de punto flotante.
- Storage con URLs firmadas porque "el backend nunca debe ver el binario".
- SWC/Vitest/oxlint como stack de build más rápido que el tradicional tsc/Jest/ESLint.

---

## 2. Estructura de carpetas

### Backend — por módulo de dominio

```
src/
  app.module.ts, main.ts
  common/                      # cross-cutting, reusable por cualquier módulo
    authorization/              # catálogo de permisos, decoradores, service
    crud/                       # BaseCrudService / BaseCrudController genéricos
    decorators/                 # @Public(), @CurrentUser(), etc.
    dto/                        # PaginationQueryDto y DTOs compartidos
    entities/                   # BaseAuditEntity
    filters/                    # exception filters globales
    guards/                     # RolesGuard, PermissionsGuard
    money/                      # helpers de dinero (transformer + decimal.js)
    storage/                    # servicio de URLs firmadas
    webhooks/
  config/                       # typeorm.config.ts, configuration.ts
  database/
    migrations/                 # una clase por archivo, timestamp-prefijo
    seeds/                      # seeders de catálogos fijos y datos demo
  modules/
    <dominio>/                  # un folder por área de negocio
      entities/<entity>.entity.ts
      dto/<entity>.dto.ts        # Create/Update DTOs, sin barrel index.ts
      services/<entity>.service.ts
      controllers/<entity>.controller.ts
      <dominio>.module.ts        # wiring: TypeOrmModule.forFeature + controllers + providers
```

> **Regla explícita:** "un entity = un archivo por capa" — se elige el módulo más simple del repo como plantilla a copiar cuando se agrega una entidad nueva.

### Frontend — por feature

```
src/
  components/
    modals/            # modales genéricos reutilizables entre features
    ui/                # primitivas shadcn/ui + composites propios (toolbar, paginación)
  core/
    auth/              # store de auth, catálogo de permisos, contexto
    guards/            # guards de ruta (beforeLoad)
  features/
    <dominio>/<feature>/
      pages/            # 1 componente top-level por pantalla
      components/       # componentes feature-local (modales de form, cards)
      services/         # 1 objeto <Entity>Service por entidad backend — wrapper fino sobre el cliente HTTP
      types/            # 1 interface por entidad/DTO
      hooks/             # (opcional) hooks específicos de ese dominio
  hooks/               # hooks compartidos globales
  lib/                 # cliente API, utilidades
  routes/              # file-based routing, un .tsx por ruta, segmentos separados por punto
```

---

## 3. Patrones de backend

### 3.1 Catálogo de permisos `recurso:acción` + distinción "propio" vs "todos"

```typescript
export const CRUD_ACTIONS = ['read', 'write', 'update', 'delete'] as const;
export type CrudAction = (typeof CRUD_ACTIONS)[number];

export const CRUD_RESOURCES = [
  'orden',
  'orden-propia',        // portal de terceros, self-service
  'proveedor',
  'proveedor-propio',
  ...
] as const;
export type CrudResource = (typeof CRUD_RESOURCES)[number];

export type PermissionName = `${CrudResource}:${CrudAction}`;
export function crudPermission(resource: CrudResource, action: CrudAction): PermissionName {
  return `${resource}:${action}`;
}
export const PERMISSION_CATALOG: PermissionName[] =
  CRUD_RESOURCES.flatMap((r) => CRUD_ACTIONS.map((a) => crudPermission(r, a)));
```

**Idea clave:** cuando un portal externo (proveedor, cliente, etc.) necesita ver/operar solo sus propios recursos, **no** se reusa el mismo `recurso:acción` con un filtro condicional — se crea un recurso distinto con sufijo `-propio`. Así otorgar `orden-propia:read` a un rol externo nunca puede destapar accidentalmente el CRUD genérico de todas las órdenes; el ID del propietario se resuelve **siempre server-side desde el JWT**, nunca lo manda el cliente.

Guard genérico (`PermissionsGuard`) lee metadata puesta por decoradores (`@CrudResourceName`, `@CrudActionName`) o un `@Permissions(...)` explícito vía `Reflector`, calcula los permisos efectivos del usuario y lanza `ForbiddenException` si no matchea.

### 3.2 Patrón "lookup" con `@Check` + seed para catálogos fijos

```typescript
export const VALORES_ESTADO = ["A", "B", "C"] as const;
export type ValorEstado = (typeof VALORES_ESTADO)[number];

@Entity()
@Check(`"valor" IN ('A','B','C')`)
export class TipoLookup extends BaseAuditEntity {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", unique: true }) valor: ValorEstado;
}
```

La migración que crea la tabla incluye el `INSERT INTO ... VALUES (...)` en el **mismo archivo**, justo después del `CREATE TABLE` con el `CHECK` embebido — así el valor siempre existe desde el primer deploy.

La variante sin `@Check` (lookups cargados a mano post-deploy) se usa para catálogos que no son consultados por switch de string exacto en el motor transaccional — solo se listan/seleccionan desde UI.

### 3.3 Baja lógica estándar y el gotcha de `withDeleted` en relaciones

```typescript
export abstract class BaseAuditEntity {
  @CreateDateColumn({ name: "fecha_hora_alta", type: "timestamptz" }) fechaHoraAlta: Date;
  @UpdateDateColumn({ name: "fecha_hora_modificacion", type: "timestamptz" })
  fechaHoraModificacion: Date;
  @DeleteDateColumn({ name: "fecha_hora_baja", type: "timestamptz", nullable: true })
  fechaHoraBaja: Date | null;
}
```

`DELETE` en cualquier ruta CRUD genérica llama `softRemove()`; las filas dadas de baja se excluyen automáticamente de queries normales. Entidades que modelan una **ventana de vigencia** (una relación N:M con fecha desde/hasta, no un ciclo de vida propio) **no** extienden esta clase — mantienen sus propias columnas desde/hasta.

**Gotcha real de TypeORM** (documentado tras reproducirlo viendo el SQL generado): TypeORM agrega siempre `AND <alias>.fecha_hora_baja IS NULL` al `ON` de cualquier join contra una entidad con `@DeleteDateColumn`, sin importar qué condición se le pase a mano — el chequeo corre en el momento en que se registra el join (`SelectQueryBuilder.join()`), no en la generación del SQL. La única forma de que un join puntual no reciba ese filtro es que `.withDeleted()` ya esté seteado en el `expressionMap` **antes** de llamar a ese join — por eso `.withDeleted()` siempre va primero en la cadena de un query builder. Eso apaga el auto-filtro para **todos** los joins de esa query, así que los que sí se quieren filtrar hay que reponerlos a mano vía `WHERE`.

### 3.4 Snapshots inmutables

Cuando un registro transaccional (una línea de venta, una orden emitida) referencia el precio/estado de otra entidad que puede cambiar en el futuro, se **copia el valor en columnas propias** en el momento de la transacción, en vez de hacer join en vivo:

```typescript
@Column({ type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
precioUnitario: string;   // congelado al momento de la operación

@Column({ type: 'numeric', precision: 5, scale: 2, transformer: percentageTransformer, default: '0.00' })
porcentajeDescuento: string;
```

El nombre de la migración que introduce estas columnas suele decir explícitamente "Snapshot" para dejar constancia de la intención de diseño.

### 3.5 Tabla de parámetros de configuración clave/valor

```typescript
@Entity()
export class ParametroSistema {
  @PrimaryColumn({ type: "varchar" }) clave: string;
  @Column({ type: "float" }) valor: number;
  @Column({ type: "text" }) descripcion: string;
  @Column({ type: "varchar" }) unidad: string;
  @UpdateDateColumn({ type: "timestamptz" }) fechaHoraModificacion: Date;
}
```

Sin `BaseAuditEntity` a propósito: un parámetro no se "da de baja", se cambia de valor — el endpoint `DELETE` ni se expone.

### 3.6 DTOs scoped por acción

```typescript
export class CreateOrdenDto {
  /* ... */
}
export class UpdateOrdenDto extends PartialType(CreateOrdenDto) {}

// Acciones específicas con reglas de estado propias, NUNCA metidas en el PATCH genérico:
export class EmitirOrdenDto {
  /* ... */
}
export class CalificarOrdenDto {
  /* ... */
}

if (estadoActual !== "pendiente") {
  throw new ConflictException('Solo se puede emitir una orden en estado "Pendiente".');
}
```

Los guards de transición de estado viven en el **service**, no en el DTO ni en un decorador de validación — el DTO define la forma del payload, el service decide si esa acción es legal dado el estado actual del registro.

### 3.7 Manejo de dinero: `numeric` + transformer + `decimal.js`

```typescript
const MoneyDecimal = Decimal.clone({ precision: 24, rounding: Decimal.ROUND_HALF_UP });
export const MONEY_SCALE = 2;

export function money(value: Decimal.Value): Decimal {
  return new MoneyDecimal(value).toDecimalPlaces(MONEY_SCALE, MoneyDecimal.ROUND_HALF_UP);
}
export function moneyString(value: Decimal.Value): string {
  return money(value).toFixed(MONEY_SCALE);
}
export const moneyTransformer: ValueTransformer = {
  to: (value) => (value == null ? value : moneyString(value)),
  from: (value: string | null) => value,   // se conserva como string, nunca Number()
};

@Column({ type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
monto: string;
```

Nunca `float` para dinero, y el valor viaja como **string** end-to-end (columna Postgres `numeric`, transformer que no castea a `Number`, y el frontend recibe/envía string también) para no perder precisión en ningún punto de la cadena.

### 3.8 Storage de archivos con URLs firmadas

```typescript
async getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
  return getSignedUrl(this.client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}
```

El navegador sube el archivo directo al bucket con la URL firmada; el backend **nunca** recibe el binario, solo genera la URL de subida y persiste la URL pública final. Para archivos que el propio backend genera (ej. un PDF), hay un método aparte de subida server-side, pero el flujo de usuario final siempre evita pasar el binario por la API.

---

## 4. Patrones de frontend

- **Cliente HTTP único** (`apiRequest<T>`): adjunta el JWT, setea `Content-Type` salvo `FormData`, maneja refresh de token con un `refreshPromise` singleton (evita refresh-races si hay múltiples 401 en paralelo), parsea errores del backend (soporta `message` string o array de class-validator unido con `". "`) y los relanza como `Error`.
- **Paginación compartida**: todo endpoint de listado responde `{ data, total, page, limit }`, y el frontend usa siempre los mismos nombres de query param (`page`/`limit`, nunca `pageSize`). Paginación server-side es la regla; paginación client-side sobre un array ya cargado en memoria solo se acepta cuando el dataset es legítimamente chico y ya tiene que estar en memoria por otra razón. Un único componente de controles de paginación se renderiza siempre debajo de la grilla/tabla (se auto-oculta si hay una sola página).
- **Componentes compartidos vs. específicos**: modales genéricos reutilizables (confirmación destructiva/no-destructiva con las mismas props pero distinto label/color, buscador+multi-select genérico dirigido por props de endpoint) viven en `components/`; todo lo que es específico de una pantalla vive dentro del feature.
- **Permisos en rutas/UI**: un catálogo de tipo `recurso:acción` (espejo tipado del backend) + un store de auth que decodifica el JWT para lo básico (id/roles) pero **hidrata los permisos reales con un fetch** a un endpoint tipo `/auth/me` — nunca confía en un mapa rol→permisos hardcodeado en el cliente. Los guards de ruta (`beforeLoad`) llaman a ese store, y si el usuario no tiene el permiso requerido, redirigen a una página de "no autorizado". **Importante:** esto es solo una capa de UX — la autorización real y la fuente de verdad es el 403 que devuelve el backend.
- **Hooks personalizados**: los transversales (ej. detectar breakpoint mobile) van en `hooks/` compartido; los que encapsulan una acción de negocio reusada por varios componentes de un mismo dominio (ej. "marcar como preferido", "sugerir un valor con fallback silencioso") van en `hooks/` dentro del feature.
- **Rutas file-based**: un archivo por ruta, segmentos anidados separados por punto en el nombre de archivo, `$param` para dinámico, `$` para splat, un único layout raíz. El árbol de rutas generado **nunca se edita a mano**.

---

## 5. Convenciones de testing

- **Unit tests**: co-ubicados junto al archivo que testean (`x.service.spec.ts` al lado de `x.service.ts`), corren contra mocks a mano de repositorios/query builders (sin levantar Nest ni DB), pensados para fijar comportamiento puntual y no regresivo — ej. un test que verifica explícitamente que un service pide `withDeleted: true` en el join correcto (fija el gotcha de la sección 3.3 para que no vuelva a colarse).
- **E2E tests**: contra base de datos real, levantando el módulo completo de la aplicación y haciendo requests HTTP reales; usan sufijos aleatorios en los datos de fixture para aislar corridas entre sí y hacen cleanup manual al final. Corren de forma serializada (no en paralelo) porque comparten la misma base.
- Configuraciones de test separadas para unit vs. e2e (distinto entrypoint de comando, distinto timeout).
- **Frontend**: sin suite automatizada por decisión consciente — la verificación de una sesión de trabajo es `tsc --noEmit` (chequeo de tipos) más probar la feature manualmente en el navegador. Nunca se declara una UI "probada" solo por haber pasado el type-check.

---

## 6. Hábito de documentación viva

Un único archivo de **changelog vivo**, en orden cronológico inverso, con entradas fechadas por feature/fix, que documenta para cada cambio:

- el motivo de negocio y las decisiones confirmadas explícitamente por el dueño del producto,
- el alcance acotado a propósito (qué no se tocó y por qué),
- detalle técnico de lo afectado (migraciones, entidades, servicios, componentes),
- bugs encontrados de paso,
- qué quedó efectivamente verificado (tests automatizados + repro manual) vs. qué quedó sin verificar.

Este documento se referencia directamente desde comentarios de código (`// ver docs/.../estado-actual.md, sección N`) como fuente de verdad para decisiones de diseño que no son obvias solo leyendo el código — reemplaza a los comentarios largos explicando "por qué" en el propio archivo fuente.

---

## 7. Convenciones de rama, commit y flujo de trabajo

- **Ramas**: `<tipo>/<TICKET>-<slug-descriptivo-en-kebab-case>` — tipos usados: `feature/`, `fix/`, `chore/`, `style/`. `TICKET` es el identificador de una tarjeta en el tablero de gestión (Trello/Jira/etc.), tratado como fuente de verdad — una tarjeta por entidad/feature.
- **Commits**: Conventional Commits con el ticket como "scope": `tipo(TICKET): descripción imperativa` — ej. `feat(PROJ-61): agrega X al formulario de Y`. Cuando no hay ticket claro (refactors chicos, chores) se omite el scope.
- **Flujo de trabajo** (regla escrita, no inferida):
  - **Investigar antes de asumir** — nunca dar por sentado que una pantalla o endpoint está conectado al backend real solo porque "se ve terminado"; verificar el estado real contra el código, no contra la memoria de sesiones anteriores.
  - **Armar un plan antes de escribir código** cuando la tarea no es trivial, en vez de arrancar a editar directamente.

---

_Documento generado a partir de la arquitectura real de un proyecto en producción con este stack. Adaptar nombres de dominio/entidades al proyecto nuevo; la estructura y los patrones se mantienen._
