# Flujos de prueba por funcionalidad

Guía práctica para probar manualmente cada funcionalidad de la plataforma
**I'm IN** de punta a punta y confirmar que funciona. Formato por feature:
**ruta → pasos → qué verificar**.

Asume Supabase con las migraciones de `supabase/migrations/` aplicadas, env de
`.env.local` completo y `npm run dev` en http://localhost:3000.

## Roles necesarios

- **Platform admin**: usuario Auth con `app_metadata.platform_role = "platform_admin"`
  (se setea desde el dashboard de Supabase o `admin.updateUserById`). Crea
  organizaciones y ve métricas de plataforma.
- **Owner / admin / event_admin**: miembros de una organización
  (`organization_users`). Operan eventos.
- **Asistente**: no necesita cuenta; se identifica por email + token de registro.

## Chequeo rápido de lógica (sin Supabase)

```bash
npm run test
```

Corre vitest sobre la lógica pura (QR token, matchmaking, meeting-slots, csv,
datetime, report, visibilidad de tarjeta). Úsalo como primer humo antes de las
pruebas manuales.

---

## 1. Login / acceso admin

- **Ruta**: `/login`
- **Pasos**: ingresar email → magic link de Supabase (redirect a
  `/auth/callback?next=/admin`). También botón LinkedIn (requiere provider
  configurado en Supabase).
- **Verificar**: sin sesión, `/admin` redirige a `/login`. Con sesión, entras al
  workspace. El link del correo aterriza en `/admin`.

## 2. Plataforma: organizaciones (solo platform admin)

- **Ruta**: `/admin/organizations`
- **Pasos**: crear organización + asignar owner por email; transferir propiedad;
  suspender / reactivar organización.
- **Verificar**: la card "Organizaciones" solo aparece si eres platform admin. Al
  suspender una org, sus admins ven la restricción y no operan eventos.

## 3. Métricas de plataforma (solo platform admin)

- **Ruta**: `/admin` (RPCs `platform_stats`)
- **Verificar**: totales agregados de orgs / eventos / inscritos / acreditados
  cuadran tras crear datos en los pasos siguientes.

## 4. Organización y equipo

- **Ruta**: `/admin/settings`
- **Pasos**: editar datos de la organización; invitar / quitar miembros con roles
  `owner` / `admin` / `event_admin`.
- **Verificar**: "Mis organizaciones" en `/admin` lista tu membresía con el rol
  correcto. Un `event_admin` no accede a settings que no le corresponden.

## 5. Crear y publicar evento

- **Ruta**: `/admin/events/new` → `/admin/events/[eventId]/edit`
- **Pasos**: crear en `draft` → completar nombre, descripción, fecha/hora
  inicio-fin, lugar, cupos, logo/portada, networking sí/no → publicar.
- **Verificar**: en `draft`, `/e/[slug]` NO está activa. Al publicar, `/e/[slug]`
  responde y hay link público de inscripción. Estados `draft`/`published`/`closed`.
  El soft-delete no muestra el evento en listados.

## 6. Opciones de perfil configurables del evento

- **Ruta**: `/admin/events/[eventId]/edit` → gestor de opciones de perfil
- **Pasos**: definir industrias / intereses / roles seleccionables del evento.
- **Verificar**: el formulario `/e/[slug]/register` ofrece exactamente esas
  opciones.

## 7. Modo de registro / aprobación

- **Ruta**: edición del evento (registration mode)
- **Pasos**: alternar entre inscripción directa y "requiere aprobación".
- **Verificar**: en modo aprobación, un inscrito verificado queda
  `pending_approval` y aparece en la cola de aprobación en
  `/admin/events/[eventId]`. Al aprobar pasa a `registered`.

## 8. Inscripción del asistente + verificación de email

- **Ruta**: `/e/[slug]` → `/e/[slug]/register`
- **Pasos**: completar formulario (nombre, email, teléfono, cargo, empresa,
  industria, intereses, consentimiento, networking sí/no) → confirmar →
  `/e/[slug]/check-email`.
- **Verificar**:
  - Email único por evento (segundo intento con mismo email = rechazo).
  - No supera el cupo máximo.
  - Estado inicial `pending_verification`. El link
    `/e/[slug]/verify?registrationId=...&token=...` activa la inscripción y
    **recién ahí** crea/enlaza el perfil global.
  - Link inválido/expirado (>24h) → `/check-email?status=invalid`. Reabrir un
    link ya verificado es idempotente y lleva a la credencial.
  - Networking = no → no aparece en el directorio.

## 9. QR / credencial + check-in

- **Credencial (asistente)**: `/e/[slug]/registered?registrationId=...&token=...`
- **Check-in (admin)**: `/admin/events/[eventId]/check-in`
- **Pasos**: escanear / pegar el token del QR.
- **Verificar** los 4 casos:
  - QR válido no usado → marca `checked_in`.
  - QR ya usado → "ya acreditado".
  - QR de otro evento / inválido → rechazo.
  - Inscripción cancelada → rechazo.

## 10. Perfil del asistente + tarjeta virtual pública

- **Perfil por evento**: `/e/[slug]/profile` (foto, cargo, empresa, industria, una
  línea, hasta 5 intereses, LinkedIn).
- **Tarjeta pública**: `/p/[profileSlug]` + imagen `/p/[profileSlug]/card`
- **Verificar**: email/teléfono no se muestran por defecto; la visibilidad de la
  tarjeta respeta `profile_card_visibility`. El botón "copiar link" funciona.

## 11. Directorio + conexiones

- **Directorio**: `/e/[slug]/directory` y detalle `/e/[slug]/directory/[profileId]`
- **Conexiones**: `/e/[slug]/connections`
- **Verificar**:
  - Solo inscritos ven el directorio; solo aparecen perfiles con networking activo.
  - Búsqueda por nombre y filtro por industria / interés.
  - "Conectar": no a uno mismo, no duplicar pendiente/aceptada; estados
    pendiente/aceptada/rechazada/cancelada.
  - Al aceptar (recíproco) se comparten datos autorizados; unicidad recíproca.

## 12. Networking goals + matchmaking

- **Ruta**: perfil/inscripción capturan `goals_seeking` / `goals_offering`;
  sugerencias en dashboard/directorio.
- **Verificar**: lógica de score en `src/lib/matchmaking.ts` (test propio). En UI,
  dos asistentes con goals complementarios (uno "busca X", otro "ofrece X")
  aparecen como match sugerido.

## 13. Meetings (reuniones 1:1)

- **Admin**: `/admin/events/[eventId]/meetings` — configurar slots/agenda.
- **Asistente**: `/e/[slug]/meetings` — solicitar / aceptar reuniones.
- **Verificar**: `meeting-slots.ts` valida solapamiento (test propio). En UI, no
  puedes reservar dos reuniones en el mismo slot; aceptar reserva el horario para
  ambos.

## 14. Comunicaciones del evento + cron

- **Composer**: `/admin/events/[eventId]/communications`
- **Dispatch**: `POST /api/communications/dispatch` (protegido con `CRON_SECRET`)
- **Verificar**: creas una comunicación programada; al llamar el endpoint con el
  secret correcto se despacha. Sin secret → 401.

## 15. Dashboard del evento + métricas

- **Ruta**: `/admin/events/[eventId]/dashboard` (auto-refresh)
- **Verificar**: refleja inscritos vs. acreditados, vistas de perfil
  (`event_profile_view_stats`), conexiones. Cambia tras el check-in del paso 9.

## 16. Post-event report

- **Ruta**: `/admin/events/[eventId]/report` + descarga `/report/download` y CSV
  `/admin/events/[eventId]/export`
- **Verificar**: `event-report.ts` y `csv.ts` tienen tests. En UI, el reporte
  cierra números del evento; el CSV descarga inscritos/acreditados; botón de
  impresión.

## 17. Landing + demo request

- **Ruta**: `/` → `/demo`
- **Verificar**: el formulario guarda en `demo_requests` y notifica a
  `SALES_NOTIFICATION_EMAIL`. Estados de éxito/error del form.

## 18. PWA (asistente)

- **Ruta**: cualquier `/e/[slug]/*` registra el service worker; manifest en
  `/manifest.webmanifest`.
- **Verificar**: en Chrome DevTools → Application, el manifest carga y el SW se
  registra; la app es instalable en móvil.

---

## Orden recomendado para una pasada end-to-end

`org (2)` → `equipo (4)` → `crear+publicar evento (5,6,7)` → `inscripción +
verificación (8)` → `check-in QR (9)` → `perfil + directorio + conexión (10,11)` →
`goals / meetings (12,13)` → `comunicaciones (14)` → `dashboard / report / CSV
(15,16)`. Landing/demo (17) y PWA (18) son independientes.
