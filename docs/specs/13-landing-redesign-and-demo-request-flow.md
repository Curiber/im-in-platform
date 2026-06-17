# 13. Landing Redesign and Demo Request Flow

## Estado

`draft ready for implementation`

Eleva el diseno visual de la landing publica y cambia el modelo de conversion
de autoservicio ("Crear evento") a lead-driven ("Agenda una demo"), con una
pagina de solicitud de demo inspirada en el estandar del mercado (tipo Brella)
pero con la identidad calida de I'm IN. Complementa el sistema de marca del
spec 08 y el analisis de [12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md).

## Problema

1. **La landing se siente basica.** Todas las superficies usan el mismo patron
   (`rounded-lg border bg-white shadow-sm`), la jerarquia tipografica esta
   comprimida, el spacing es apretado, no hay imagenes ni caras humanas, los
   gradientes de marca ya definidos casi no se usan, no hay prueba social y no
   hay movimiento. Lee como plantilla, no como producto.
2. **El CTA principal es incoherente con el modelo de negocio.** Hoy "Crear
   evento" lleva a `/admin/events/new`, pero las organizaciones no son
   autoservicio: un platform admin las crea (spec 10). El visitante de
   marketing no deberia aterrizar en un formulario interno de creacion de
   evento, sino en una solicitud de demo / contacto con ventas.

## Objetivos

- Rediseñar la landing con jerarquia, aire, profundidad, gradientes de marca,
  caras humanas, prueba social y micro-interacciones, **sin** copiar el look
  corporativo frio del benchmark: I'm IN es mas calido y humano.
- Reemplazar el CTA "Crear evento" por "Agenda una demo" en toda la landing.
- Crear la pagina `/demo` con layout de dos columnas (propuesta de valor +
  formulario), estilo oscuro de alto contraste a la Brella pero con la paleta
  navy/cyan/teal propia.
- Capturar el lead en base de datos y notificar a ventas.
- Usar el **logo real** (`/brand/im-in-logo*.png`), no el wordmark en texto.

## No objetivos

- No rediseñar el admin ni las vistas de asistente en esta epica (queda para
  una fase posterior del sistema visual; ver spec 08).
- No construir un CRM ni pipeline de ventas: solo capturar y notificar.
- No agregar self-service signup de organizaciones (sigue siendo lead-driven).
- No introducir librerias de animacion pesadas; el movimiento se resuelve con
  CSS/Tailwind (transiciones y hover-lift) en esta fase.

## Decisiones de diseño

### Sistema visual elevado (landing)

- **Tipografia**: titular hero grande con tracking negativo y leading ajustado;
  salto claro entre h1 / h2 / cuerpo.
- **Radios**: cards a `rounded-2xl`/`rounded-3xl` (no `rounded-lg`).
- **Elevacion variable**: tarjeta del hero y CTA final con sombra fuerte;
  cards de contenido con sombra sutil. Hover-lift (`hover:-translate-y-1
  hover:shadow-lg`) en cards y CTAs clicables.
- **Gradientes de marca** (`brand-gradient-primary/soft/accent`) usados en CTA
  primario, badges, iconos y blobs de fondo del hero.
- **Caras humanas**: avatares con gradiente e iniciales en la tarjeta de
  directorio del hero (placeholder hasta tener fotos/clientes reales).
- **Prueba social**: franja con logos de organizaciones (placeholder) y un stat
  con peso. Marcar claramente como pendiente de datos reales.
- **Aire**: secciones a `py-24`+.

### Modelo de conversion

- "Crear evento" -> "Agenda una demo" en header, hero, CTA final y footer.
- Destino: `/demo`. "Ingresar" sigue apuntando a `/login`.
- El acceso real de organizadores sigue siendo por invitacion (spec 10);
  la landing ya no expone `/admin/events/new`.

### Pagina `/demo`

Layout dos columnas (en mobile, apiladas):

- **Izquierda** (fondo navy/gradiente, alto contraste): titular fuerte,
  bullets de valor (mejores reuniones, networking con intencion, mas
  patrocinios, retencion), parrafo de respaldo y badges/sellos de confianza.
- **Derecha** (tarjeta clara): formulario de solicitud de demo.

Campos del formulario (es-CL, equivalentes al estandar del mercado):

- Email (req)
- Nombre (req)
- Apellido (req)
- Telefono (opcional)
- Nombre de la organizacion (req)
- Pais (select, default Chile, foco LATAM)
- Tipo de organizacion (req; reusa los valores del enum `organization_type`)
- Asistentes anuales estimados (select por rangos)
- Cuentanos sobre tu evento (textarea, opcional)
- Como nos conociste (opcional)
- Consentimiento de contacto (req)

Comportamiento:

- Server action `submitDemoRequest` valida con Zod, inserta en
  `public.demo_requests` via service role y envia notificacion a ventas
  (best-effort; la falla de email no invalida el lead, patron ya usado en el
  proyecto).
- Patron de UI: `useActionState` (igual que el formulario de registro), con
  estado de exito inline ("Gracias, te contactaremos").
- Mensaje neutro de error sin filtrar detalles internos.

## Modelo de datos

### Nueva tabla `demo_requests`

- `id uuid pk default gen_random_uuid()`
- `email text not null`
- `first_name text not null`
- `last_name text not null`
- `phone text`
- `organization_name text not null`
- `country text`
- `organization_type text`
- `annual_attendees text`
- `message text`
- `referral_source text`
- `status text not null default 'new'` (new / contacted / qualified / closed)
- `created_at timestamptz not null default now()`
- Constraints: email y nombres no en blanco.
- Indice por `(status, created_at)`.

RLS: habilitada, **sin** policies para `anon`/`authenticated` (deny by
default). Las inserciones se hacen con service role desde la server action y la
lectura queda para herramientas internas/admin en una fase posterior. No se
otorga acceso publico a la tabla.

## Variables de entorno

- `SALES_NOTIFICATION_EMAIL` (opcional): destino de la notificacion de leads.
  Si falta, cae en `EMAIL_FROM`. Si tampoco hay credenciales de email, la
  notificacion se omite en silencio y el lead igual se guarda.

## Criterios de aceptacion

- La landing usa el logo real, jerarquia tipografica clara, gradientes de
  marca, hover-lift y una franja de prueba social.
- Ningun CTA de la landing apunta a `/admin/events/new`; todos los CTA de
  conversion dicen "Agenda una demo" y llevan a `/demo`.
- `/demo` renderiza el layout de dos columnas con el formulario completo y es
  responsive.
- Enviar el formulario valido inserta una fila en `demo_requests` y muestra el
  estado de exito; un envio invalido muestra error inline sin romper la pagina.
- La notificacion por email es best-effort y su ausencia no bloquea el guardado.
- `npm run lint` y `npm run build` pasan.

## Tareas

### Epic 31: Sistema visual elevado de la landing

- [ ] Rediseñar `src/app/page.tsx`: hero, "como funciona", beneficios, CTA y
      footer con el sistema elevado.
- [ ] Usar el logo real en header y footer.
- [ ] Agregar hover-lift y transiciones a cards y CTAs.
- [ ] Agregar franja de prueba social (placeholder marcado).

### Epic 32: Flujo de solicitud de demo

- [ ] Migracion `create_demo_requests` con RLS deny-by-default.
- [ ] Server action `submitDemoRequest` (Zod + insert service role).
- [ ] Helper de email `sendDemoRequestNotification` (best-effort).
- [ ] Pagina `/demo` (dos columnas, estilo navy de alto contraste).
- [ ] Formulario cliente con `useActionState` y estado de exito inline.
- [ ] Reemplazar CTAs de la landing por "Agenda una demo" -> `/demo`.
- [ ] Documentar `SALES_NOTIFICATION_EMAIL` en `.env.example`.

### Epic 33: Verificacion

- [ ] `npm run lint` y `npm run build` pasan.
- [ ] Prueba manual: enviar demo valida e invalida; revisar fila en DB.
- [ ] Revisar responsive de landing y `/demo` en mobile y desktop.

## Riesgos

- Los logos de prueba social son placeholders; usar datos/permisos reales antes
  de publicar para no afirmar clientes inexistentes.
- El cambio de "Crear evento" a "Agenda una demo" altera el modelo de
  conversion; confirmar con producto que el acceso de organizadores se mantiene
  por invitacion.
- Sin rate limiting, `/demo` puede recibir spam; se mitiga en el hardening del
  spec 11 (riesgo aceptado para esta fase).
