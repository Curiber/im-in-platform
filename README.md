# I'm IN Platform

Plataforma web responsive para crear eventos, gestionar inscripciones,
acreditar asistentes con QR y facilitar networking privado entre participantes.

## Estado

- Stack inicial: Next.js, React, TypeScript, Tailwind CSS.
- Integracion preparada: Supabase Auth, Database y Storage.
- Deploy objetivo: GitHub + Vercel.
- Specs vivos: [docs/specs](docs/specs).

## Comandos

```bash
npm run dev
npm run build
npm run lint
```

## Variables

Copia `.env.example` a `.env.local` y completa las credenciales reales cuando
exista el proyecto de Supabase y el ambiente de Vercel.

## Decision de producto

El MVP se construye como web app responsive/PWA, no como app mobile nativa. El
objetivo inicial es validar el flujo:

`evento -> inscripcion -> perfil -> QR -> check-in -> directorio -> conexion -> metricas`.
