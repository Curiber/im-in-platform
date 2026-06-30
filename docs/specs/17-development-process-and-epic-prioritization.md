# 17. Proceso de desarrollo y priorizacion de epicas

## Estado

`vigente — gobierna la ejecucion desde 2026-06-25`

Este documento fija **como se desarrolla I'm IN de ahora en adelante** y **en que
orden** se construyen las epicas. Es la fuente de verdad de proceso y prioridad;
los specs por feature (11, 12, 16, etc.) siguen siendo la fuente de verdad de
*que* se construye en cada caso. Si este documento y otro spec se contradicen en
**orden o prioridad**, manda este; si se contradicen en *alcance funcional*,
manda el spec del feature.

Sustituye, en lo que respecta a orden de ejecucion, al plan de la seccion N de
[12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md),
reordenado segun la decision estrategica de la seccion 2.

---

## 1. Modelo de tres roles

Toda la plataforma se organiza alrededor de tres roles base (cada uno con
sub-roles, pero estos son los cimientos):

| Rol | Quien es | Superficie principal |
| --- | --- | --- |
| **Platform admin** | Administra toda la plataforma: crea organizaciones (clientes), asigna ownership, ve metricas globales | **Web** |
| **Organization admin** | Administra una organizacion dentro de la plataforma: eventos, equipo, comunicaciones, dashboard. Incluye sub-roles `owner` / `admin` / `event_admin` | **Web** |
| **Attendee** | Asiste a eventos y hace networking: perfil, directorio, conexiones, reuniones, QR | **Mobile (app nativa), con puente web/PWA mientras tanto** |

Sub-roles ya existentes en datos: `organization_users.role` (`owner`/`admin`/
`event_admin`) y `platform_role`. No se crean roles nuevos hasta que un caso real
lo exija (p. ej. un `staff` solo-check-in seria un valor mas del enum, no una
tabla nueva).

---

## 2. Decision estrategica

**Los roles de administracion (platform admin y organization admin) viven en
web. El asistente vive en mobile.**

Razon: el contexto de uso de cada rol manda. Los administradores trabajan
sentados frente a un computador (crear eventos, gestionar equipo, ver metricas,
comunicar). El asistente esta caminando por el evento con el telefono (QR,
directorio, conexiones, reuniones). Forzar al admin a un telefono o al asistente
a un escritorio es pelear contra el contexto.

### Consecuencia operativa

1. **Primero se deja el web de administracion solido y production-ready.** Es el
   grueso del trabajo inmediato y habilita correr eventos reales.
2. **El asistente se mantiene funcionando en web/PWA como puente**, no se espera
   a la app para poder operar eventos.
3. **La app nativa del asistente se construye despues**, y esta *bloqueada* por
   dos cimientos estructurales que igual hay que construir: auth de asistente
   (OTP) y una capa API (hoy toda la logica vive en server actions que solo el
   web Next puede invocar). Esos cimientos no son trabajo extra: son exactamente
   lo que la app necesita, hecho en el orden correcto.

### Lo que esta decision NO significa

- No significa abandonar la experiencia web del asistente: se mantiene y se
  mejora a PWA.
- No significa construir "todo el admin" antes de validar. Ver seccion 6
  (anti-trampa de paridad).

---

## 3. Principios de trabajo

1. **Spec-driven.** Cada feature nuevo entra con su spec en `docs/specs/`
   siguiendo el ciclo del repo: spec -> tareas -> implementacion -> verificacion.
   Las correcciones/refactors pequenos no necesitan spec propio.
2. **Seguridad primero.** Los cimientos del spec 11 son bloqueantes para
   eventos reales y se cierran antes de construir features encima.
3. **Tests como red.** Vitest entra antes de refactors grandes. Ningun refactor
   estructural sin tests que lo respalden.
4. **Una epica = una rama = una PR.** Nombre de rama `epic/<n>-<slug>` o
   `docs/<slug>` para documentos. PR contra `main`. Las ramas se auto-borran al
   mergear (configurado en el repo).
5. **`main` siempre desplegable.** `lint` y `build` pasan limpios antes de
   mergear. `main` local se mantiene sincronizado con `origin/main`.
6. **Incremental, sin reescrituras.** Se evoluciona el codigo existente; no se
   reescribe lo que funciona (modelo de datos, RLS, QR/check-in, brand system).
7. **Anti-trampa de paridad.** No se persigue el checklist de un SaaS enterprise.
   Se prioriza correr un evento real completo y seguro, y desde ahi se profundiza
   segun lo que pidan organizadores reales.

---

## 4. Orden de ejecucion

```
HOY ───────────────────────────────────────────────────────► APP
  │
  ├─ FASE 1  Cimientos de seguridad (spec 11) ─── toca los 3 roles, bloqueante
  │
  ├─ FASE 2  Admin de organizacion (rol 2) ────── grueso del web, "organizador primero"
  │
  ├─ FASE 3  Admin de plataforma (rol 1) ──────── quick wins
  │
  ├─ FASE 4  Asistente web/PWA (rol 3) ─────────── puente para correr eventos ya
  │
  │   ◆ HITO: un evento real de 100-300 personas opera completo y seguro
  │
  ├─ FASE 5  Habilitadores de app: API v1 + auth OTP de asistente
  │
  └─ FASE 6  App nativa Expo (rol 3)
```

Las fases 1-4 entregan el **hito de evento real**: lo que de verdad importa,
porque un evento real da validacion, datos para el matchmaking y feedback. Las
fases 5-6 construyen la app sobre los cimientos que de todos modos se necesitan.

---

## 5. Priorizacion de epicas

Estado a 2026-06-25. `[x]` = hecho, `[~]` = parcial, `[ ]` = pendiente.

### FASE 1 — Cimientos de seguridad (spec 11)

| Orden | Epica | Que cierra | Estado |
| --- | --- | --- | --- |
| 1.0 | **Epic 27** — Entorno + Vitest | Schema completo de `env.ts`, Vitest + script `test`, primeros tests, limpieza de foto en bucket, actions admin a estado inline, reemplazo de `findAuthUserByEmail` | `[~]` (red de tests + env/boot en PR #13; faltan bucket, actions inline, `findAuthUserByEmail`) |
| 1.1 | **Epic 24** — RLS alineada con roles | RPCs `security definer` para soft delete/restore + trigger de guardia (hoy un `event_admin` borra via PostgREST directo) | `[ ]` |
| 1.2 | **Epic 28** — Org atomica | Creacion de organizacion transaccional (accion de platform admin, hoy no atomica) | `[ ]` |
| 1.3 | **Epic 23** — Verificacion de email | Estado `pending_verification`, token solo por email, ruta de verificacion | `[ ]` |
| 1.4 | **Epic 25** — Integridad inscripcion/check-in | RPC de inscripcion con capacidad atomica, guard de check-in, rechazar evento terminado | `[ ]` |
| 1.5 | **Epic 26** — Endurecimiento salida/token | `timingSafeEqual`, `Referrer-Policy`, evaluar token en cookie de sesion | `[ ]` |
| — | Epic 22 — Privacidad tarjeta publica | Visibilidad opt-in por campo | `[x]` (commit `9ffc173`) |

Razon del orden: 27 primero porque la red de tests habilita el resto con
seguridad; 24 y 28 porque tocan directamente acciones de admin (el foco
inmediato); 23/25/26 son superficie publica/asistente pero igual bloqueantes
para eventos reales.

### FASE 2 — Admin de organizacion (rol 2)

| Orden | Trabajo | Fuente | Estado |
| --- | --- | --- | --- |
| 2.0 | Transferencia de ownership | spec 16 (unico pendiente) / spec 10 Epic 29 | `[x]` (Epic 29: RPC atomica + indice de un solo owner + UI) |
| 2.1 | Config de networking por evento (categorias de intereses/objetivos configurables, modo aprobacion para eventos cerrados) | spec 12 §F.3 | `[ ]` |
| 2.2 | Comunicaciones: email a inscritos (confirmados/acreditados) + recordatorio pre-evento | spec 12 §F.5 | `[ ]` |
| 2.3 | Dashboard de networking (conexiones, perfiles vistos, opt-in) + tiempo real/polling | spec 12 §F.6 | `[ ]` |
| 2.4 | Gestion de reuniones (puntos de encuentro + vista de reuniones del evento) | spec 12 §F.4 | `[ ]` (depende del dominio de reuniones) |
| 2.5 | Reportes post-evento (ademas del CSV) | spec 12 §F.7 | `[ ]` |

Nota: gestion de equipo (invitar/cambiar rol/quitar) y shell admin ya estan
hechos (spec 16, epics 40-42; equivalen a epics 29-30 del spec 10).

### FASE 3 — Admin de plataforma (rol 1)

| Orden | Trabajo | Estado |
| --- | --- | --- |
| 3.0 | Listado y gestion de todas las organizaciones (ver, suspender/archivar) | `[ ]` |
| 3.1 | Metricas globales de plataforma | `[ ]` |

Nota: crear organizacion + asignar owner ya existe (spec 10 Epic 21).

### FASE 4 — Asistente web/PWA (rol 3)

| Orden | Trabajo | Estado |
| --- | --- | --- |
| 4.0 | Mantener el flujo web del asistente funcionando (directorio, conexiones, perfil, QR) | `[x]` base existente |
| 4.1 | Objetivos de networking en registro/perfil + matchmaking score v1 con explicacion del match | `[ ]` |
| 4.2 | Reuniones 1:1 simples (proponer franja + punto de encuentro, aceptar/rechazar, agenda personal) | `[ ]` |
| 4.3 | PWA instalable (manifest + service worker) | `[ ]` |

### FASE 5 — Habilitadores de app

| Orden | Trabajo | Estado |
| --- | --- | --- |
| 5.0 | Extraer logica de server actions a `src/lib/services/*` (con tests) | `[ ]` |
| 5.1 | Capa API v1 (route handlers `/api/v1/*` o RPCs) consumible por mobile | `[ ]` |
| 5.2 | Auth de asistente (Supabase Auth OTP) + reclamo de perfil por email | `[ ]` |

### FASE 6 — App nativa

| Orden | Trabajo | Estado |
| --- | --- | --- |
| 6.0 | App Expo/React Native del asistente (MVP: login OTP, evento, perfil, recomendados, conexion, reunion, agenda, QR, push) | `[ ]` |

---

## 6. Definicion de "listo" y anti-trampa de paridad

**Hito de evento real (cierre de Fase 4):** un evento de 100-300 personas opera
completo y seguro, y el demo muestra networking con intencion, no solo un
listado. Requiere: Fase 1 cerrada + admin de organizacion suficiente (Fase 2) +
asistente web/PWA con objetivos y reuniones simples (Fase 4).

**No se construye antes de validar con un evento real:** chat realtime, sponsors,
branding por evento avanzado, reportes comparativos entre eventos, matchmaking
con IA/embeddings, app admin nativa. Estos esperan a tener datos y demanda real.

---

## 7. Mecanica de Git

- Rama por epica: `epic/<n>-<slug>`; documentos: `docs/<slug>`.
- PR contra `main`; `lint` + `build` verdes antes de mergear.
- Ramas se auto-borran al mergear (repo configurado con
  `delete_branch_on_merge`).
- `main` local se sincroniza con `--ff-only`; no se trabaja directo sobre `main`.

---

## 8. Proximo paso

**Fase 1, Epic 27 — cerrar lo que falta.** La red de tests (Vitest + primeros
tests), el schema de `src/lib/env.ts` y la validacion de boot en produccion ya
estan en la PR #13. Quedan estas tres tareas del Epic 27:

1. Borrar la foto anterior del bucket al subir una nueva.
2. Migrar las actions del admin de `throw` a estado de formulario inline.
3. Reemplazar `findAuthUserByEmail` paginado por un lookup directo por email.

Cerradas esas, sigue **Epic 24** (RLS alineada con roles) por tocar
directamente las acciones destructivas del admin.
