# 00. Product Decisions

## Vision

I'm IN transforma la inscripcion de un evento en una experiencia de networking
estrategico: ayuda a organizadores a operar eventos y a asistentes a descubrir
personas relevantes antes y durante el encuentro.

## Hipotesis central del MVP

Las personas estan dispuestas a crear un perfil breve y usar un directorio
privado del evento si eso les permite encontrar conexiones profesionales de
mayor valor.

## Decisiones tomadas

- Construir una web app responsive con comportamiento PWA.
- No partir con app mobile nativa.
- Usar Next.js, TypeScript, Supabase, GitHub y Vercel.
- Usar Supabase Auth como base de identidad.
- Pedir email como identificador principal; no pedir RUT por defecto.
- Separar inscripcion administrativa de perfil visible para networking.
- Permitir inscripcion sin perfil publico.
- No incluir chat, pagos ni algoritmos ML en el MVP.
- Incluir match simple y dashboard como capa temprana, pero no bloquear el
  primer flujo operativo si se decide recortar.

## Tension principal de alcance

El documento original incluye dos niveles mezclados:

- MVP minimo: evento, inscripcion, perfil, QR, check-in, directorio y conectar.
- V1.5: match simple, analytics, agenda y notificaciones.

La recomendacion es construir el MVP por verticales completas. Primero debe
funcionar un evento real de punta a punta; luego se agregan mejoras de
inteligencia y reporting.

## Criterio de exito

El piloto es exitoso si:

- Un organizador crea y publica un evento sin soporte tecnico.
- Los asistentes completan inscripcion y perfil en menos de 2 minutos.
- Una proporcion relevante acepta aparecer en el directorio.
- Durante el evento se registran check-ins reales por QR.
- Se envian y aceptan solicitudes de conexion.
- El organizador obtiene datos accionables al cierre del evento.
