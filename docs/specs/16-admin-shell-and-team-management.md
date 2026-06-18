# 16. Admin Shell and Team Management

## Estado

`draft ready for implementation`

Rediseña el panel de organizador con un shell de navegacion persistente y
agrega gestion de miembros del equipo. Implementa los epics 29 y 30 del
[10-admin-organization-and-event-management.md](10-admin-organization-and-event-management.md)
y extiende el sistema visual (specs 08, 13, 14, 15) al admin.

## Problema

- Cada pantalla del admin armaba su propio header y el boton de cerrar sesion
  solo estaba en algunas, dejando al usuario "encerrado" en subpantallas.
- No existia gestion de miembros: una organizacion se creaba con un owner
  inicial, pero no se podia invitar, cambiar rol ni quitar miembros despues
  (aunque las policies RLS de `organization_users` ya lo permitian).
- Varias pantallas mostraban el wordmark "I'm IN" como texto en vez del logo.

## Objetivos

- Shell de admin con **navegacion lateral persistente** (Inicio, Eventos,
  Organizaciones si es platform admin, Configuracion), indicador de
  organizacion/rol y **Cerrar sesion siempre visible**.
- Migrar todas las pantallas del admin al shell, elevando su estilo.
- Gestion de equipo en Configuracion: invitar miembro por email, cambiar rol
  (admin / event_admin) y quitar miembro.
- Usar el **logo real** en todas las paginas donde habia wordmark de texto.

## No objetivos

- No implementar transferencia de ownership (queda como mejora futura; los
  owners se gestionan aparte).
- No rediseñar la tarjeta PNG descargable (`/p/[slug]/card`).

## Decisiones

### Shell

- `AdminShell` (server): obtiene usuario, organizacion principal, rol y flag
  de platform admin; envuelve el contenido con `AdminSidebar`.
- `AdminSidebar` (client): navegacion con `usePathname` para marcar activo;
  logo blanco (rail de iconos en mobile, completo en desktop); pie con
  organizacion/rol y formulario de cerrar sesion.
- Cada pagina deja de renderizar su header propio y solo aporta su contenido.

### Gestion de miembros

- Acciones (`addOrganizationMember`, `updateOrganizationMemberRole`,
  `removeOrganizationMember`) con verificacion de rol (owner/admin gestionan;
  solo owner quita). Reusa la invitacion por email de Supabase Auth.
- Los owners no se editan ni quitan desde este panel (`neq('role','owner')`).
- UI en Configuracion: lista de miembros con email y rol, selector de rol,
  quitar (solo owner) e invitar por email.

## Criterios de aceptacion

- Todas las rutas `/admin/*` muestran la navegacion lateral con logo y cerrar
  sesion.
- Owner/admin pueden invitar miembros, cambiar su rol y (owner) quitarlos.
- Ninguna pagina muestra el wordmark "I'm IN" como texto donde corresponde el
  logo (login, tarjeta publica, admin).
- `npm run lint` y `npm run build` pasan.

## Tareas

### Epic 40: Admin shell

- [x] `AdminShell` + `AdminSidebar` con logo, navegacion y logout.
- [x] Migrar las 9 pantallas del admin al shell.
- [x] Logo real en login y tarjeta publica.

### Epic 41: Gestion de equipo

- [x] Acciones add/update-role/remove con control de permisos.
- [x] Panel de equipo en Configuracion.
- [ ] Transferencia de ownership (futuro).

### Epic 42: Verificacion

- [x] `npm run lint` y `npm run build` pasan.
- [ ] Prueba manual: invitar, cambiar rol y quitar miembro.

## Riesgos

- `addOrganizationMember` y el listado de miembros usan `auth.admin` (service
  role) y resuelven emails con `getUserById`; sin paginacion masiva, escala
  bien para equipos chicos.
- La invitacion depende del proveedor de email configurado; sin credenciales,
  el usuario se crea pero no recibe el correo (mismo patron del proyecto).
