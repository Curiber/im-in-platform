# 02. User Flows

## Organizador crea evento

1. Entra a zona privada.
2. Inicia sesion.
3. Crea evento en borrador.
4. Completa datos base.
5. Define cupos y networking.
6. Publica evento.
7. Copia link publico de inscripcion.

Estados relevantes:

- `draft`: editable, no publico.
- `published`: publico y acepta inscripciones.
- `closed`: no acepta nuevas inscripciones.

## Asistente se inscribe

1. Abre link publico.
2. Revisa informacion del evento.
3. Completa formulario.
4. Acepta consentimiento de inscripcion.
5. Decide si participa en networking.
6. Confirma.
7. Recibe QR.

Reglas:

- Email unico por evento.
- El cupo no puede superar el maximo definido.
- Si networking es `false`, no se crea perfil visible para ese evento.

## Asistente participa en networking

1. Completa o reutiliza perfil breve.
2. Selecciona intereses.
3. Acepta aparecer en directorio.
4. Ve directorio del evento.
5. Filtra perfiles.
6. Solicita conectar.
7. Recibe aceptacion o rechazo.

Reglas:

- El directorio es privado por evento.
- El contacto directo se comparte solo con aceptacion mutua.
- Las solicitudes ocurren dentro de un evento, no globalmente.

## Check-in en evento

1. Admin entra a vista de acreditacion.
2. Escanea QR del asistente.
3. Sistema valida token.
4. Sistema registra check-in.
5. Admin ve resultado.

Casos:

- QR valido y no usado: registrar acreditacion.
- QR valido ya usado: mostrar estado acreditado.
- QR invalido o evento incorrecto: rechazar.
- Inscripcion cancelada: rechazar.

## Cierre y datos

1. Admin revisa dashboard.
2. Descarga CSV de inscritos y asistentes reales.
3. Revisa solicitudes y conexiones aceptadas.
4. Exporta aprendizajes para el siguiente evento.
