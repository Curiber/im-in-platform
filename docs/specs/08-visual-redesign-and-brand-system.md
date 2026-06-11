# 08. Visual Redesign and Brand System

## Estado

`draft ready for design implementation`

Este spec define el rediseno visual de I'M IN. Debe quedar como tareas y specs
por ahora; no se implementa hasta cerrar la epica de perfil/foto/tarjeta o hasta
que producto priorice la capa visual.

## Referencias entregadas

- Logo propuesto con isotipo de nodos y texto `i'm in`.
- Tarjeta vertical UAI como referencia de jerarquia: foto protagonista,
  contraste fuerte, datos de contacto con iconos, QR central y cierre de marca.

## Direccion visual

I'M IN debe sentirse:

- Profesional.
- Moderna.
- Confiable.
- Tecnologica.
- Cercana.
- Conectadora.

La estetica debe comunicar networking inteligente, oportunidades profesionales y
encuentros relevantes en eventos.

## Paleta propuesta

Tokens base:

- `navy-950`: `#071B33`
- `navy-900`: `#0B2A4A`
- `blue-700`: `#1267B3`
- `cyan-500`: `#19A7CE`
- `aqua-400`: `#36D1C4`
- `mint-300`: `#8BE6D1`
- `slate-900`: `#101828`
- `slate-600`: `#475467`
- `slate-100`: `#F2F4F7`
- `surface`: `#FFFFFF`
- `surface-soft`: `#F7FAFC`

Gradientes:

- Primary: `linear-gradient(135deg, #071B33 0%, #1267B3 48%, #36D1C4 100%)`
- Soft: `linear-gradient(135deg, #EAF7FF 0%, #E8FFF9 100%)`
- Accent: `linear-gradient(135deg, #19A7CE 0%, #8BE6D1 100%)`

Regla: usar gradientes para enfasis, no como fondo dominante de toda la app.

## Tipografia

- Mantener tipografia moderna, limpia y legible.
- Recomendado: Geist Sans si se mantiene stack Vercel/Next.
- Titulos con peso 600/700.
- Texto funcional con peso 400/500.
- Evitar letter spacing negativo.

## Sistema visual

### Logo

- Usar logo elegido de I'M IN en header, login y tarjetas.
- Preparar variantes:
  - color sobre claro;
  - blanco sobre navy;
  - isotipo solo para favicon/avatar de app.

### Iconografia

Usar `lucide-react` para:

- nodos/conexion;
- calendario/eventos;
- usuarios/directorio;
- QR;
- mensaje/conexion;
- tarjeta/contacto;
- analytics.

### Componentes base

- Header app/admin.
- Botones primarios y secundarios.
- Inputs y selects.
- Cards de evento.
- Cards de perfil.
- Badges de estado.
- Paneles de dashboard.
- Empty states.
- Tarjeta virtual.

Radio recomendado:

- Cards: 8px.
- Botones: 6-8px.
- Inputs: 6-8px.

## Home publica

La home debe explicar rapidamente:

I'M IN es una plataforma para que profesionales descubran eventos, conecten con
personas relevantes antes, durante y despues de un encuentro, y generen
oportunidades reales de networking.

Secciones:

1. Hero
   - H1 claro.
   - Bajada corta.
   - CTAs: `Crear perfil`, `Explorar eventos`.
   - Visual de conexiones profesionales o mockup de plataforma.
2. Como funciona
   - Crea tu perfil.
   - Encuentra eventos y personas relevantes.
   - Conecta y continua el vinculo post evento.
3. Beneficios
   - Networking eficiente.
   - Mejores conexiones.
   - Oportunidades profesionales.
   - Seguimiento post-evento.
4. Visual de plataforma
   - Mockups de directorio, perfil y tarjeta.
5. Casos de uso
   - Asistentes.
   - Organizadores.
   - Empresas/comunidades.
6. CTA final
   - Invitacion directa a sumarse.

## App interna

El rediseno no debe convertir herramientas operativas en landing pages. Admin,
check-in, dashboard y formularios deben ser densos, claros y escaneables.

Rutas a redisenar:

- `/`
- `/login`
- `/admin`
- `/admin/events`
- `/admin/events/new`
- `/admin/events/[eventId]`
- `/e/[slug]`
- `/e/[slug]/register`
- `/e/[slug]/registered`
- `/e/[slug]/directory`
- `/e/[slug]/directory/[profileId]`
- `/e/[slug]/connections`

## Tarjeta virtual

Direccion visual:

- Formato vertical mobile-first.
- Header con logo/isotipo.
- Foto grande o bloque visual protagonista.
- Nombre con alta jerarquia.
- Headline/descripcion breve.
- Cargo y empresa.
- Contacto con iconos.
- QR central.
- CTA textual: `Conectemos`.
- Footer con tres conceptos: `Conectar`, `Compartir`, `Crear impacto`.

No copiar la tarjeta de referencia literalmente. Usar su estructura como
inspiracion y adaptar la marca I'M IN.

## Criterios de aceptacion

- La marca se reconoce en el primer viewport.
- La paleta azul/turquesa/verde agua se aplica de forma consistente.
- No hay UI dominada por un solo azul plano.
- Los CTAs principales son visibles.
- Los formularios siguen siendo faciles de completar.
- El directorio prioriza foto, nombre, cargo, empresa e intereses.
- La tarjeta virtual funciona en mobile y desktop.
- No hay textos que se corten en botones o cards.
- `npm run lint` y `npm run build` pasan.
- Se verifica visualmente con screenshots desktop/mobile.

## Tareas

### Epic 14: Brand foundation

- [x] Elegir logo final y exportar assets web.
- [x] Usar `public/brand/im-in-logo.png`.
- [x] Usar `public/brand/im-in-mark.png`.
- [x] Definir tokens CSS en `globals.css`.
- [x] Crear utilidades de gradiente y superficies.
- [x] Actualizar favicon.

Refinamiento aplicado despues del primer pase:

- [x] Tipografia Geist Sans/Mono via `next/font`, reemplaza Arial.
- [x] Utilidades `bg-brand-gradient-*` reemplazan sintaxis arbitraria.
- [x] `favicon.ico` real generado desde `im-in-mark.png`, 1.7 KB.

### Epic 15: Marketing/home redesign

- [x] Redisenar `/` con hero, beneficios, como funciona y CTA final.
- [x] Agregar visual de plataforma o mockup.
- [x] Agregar CTAs a perfil/eventos.
- [x] Verificar mobile.

Refinamiento aplicado despues del primer pase:

- [x] H1 con propuesta de valor en vez del nombre de marca.
- [x] Header sticky con anchors a secciones y scroll suave.
- [x] Bullets de confianza bajo el hero.
- [x] Footer de marca con logo blanco transparente y tagline.

### Epic 16: Public event and registration redesign

- [x] Redisenar `/e/[slug]`.
- [x] Redisenar `/e/[slug]/register`.
- [x] Redisenar `/e/[slug]/registered`.
- [x] Incorporar logo/event brand si existe.
- [x] Mejorar jerarquia de QR y acciones post-registro.

### Epic 17: Networking UI redesign

- [ ] Redisenar directorio con foto y perfiles mas claros.
- [ ] Redisenar detalle de perfil.
- [ ] Redisenar conexiones recibidas/enviadas.
- [ ] Agregar estados visuales para solicitudes pendientes y aceptadas.

### Epic 18: Admin UI polish

- [ ] Redisenar listado de eventos.
- [ ] Redisenar detalle de evento.
- [ ] Redisenar dashboard.
- [ ] Redisenar check-in para uso rapido en puerta.
- [ ] Mantener densidad y claridad operativa.

## Orden recomendado

1. Brand foundation.
2. Tarjeta virtual.
3. Public event/registration.
4. Directorio/perfil/conexiones.
5. Home publica.
6. Admin polish.

La razon: la tarjeta y el perfil definen el lenguaje visual real del producto;
la home debe vender algo que ya se vea consistente dentro de la app.
