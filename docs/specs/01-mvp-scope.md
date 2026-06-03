# 01. MVP Scope

## Debe tener

### Creacion de eventos

El administrador crea un evento con:

- Nombre.
- Descripcion breve.
- Fecha.
- Hora de llegada o inicio.
- Hora de termino aproximada.
- Lugar.
- Cupos.
- Logo opcional.
- Estado: borrador, publicado, cerrado.
- Networking activado: si/no.

Criterios de aceptacion:

- Un evento en borrador no tiene pagina publica activa.
- Un evento publicado genera link publico de inscripcion.
- El administrador puede ver y editar datos base antes del evento.

### Inscripcion de asistentes

Formulario publico asociado a un evento publicado.

Campos base:

- Nombre.
- Email.
- Telefono opcional.
- Cargo o rol.
- Empresa u organizacion.
- Industria o area.
- Intereses seleccionables.
- Consentimiento de datos.
- Participacion en networking: si/no.

Criterios de aceptacion:

- No se permite duplicar email dentro del mismo evento.
- Toda inscripcion genera confirmacion en pantalla.
- Toda inscripcion genera una credencial QR.
- Si el usuario no acepta networking, no aparece en el directorio.

### Perfil del asistente

Perfil breve reutilizable con visibilidad por evento.

Campos visibles sugeridos:

- Nombre.
- Foto opcional.
- Cargo.
- Empresa u organizacion.
- Industria o area.
- Descripcion en una linea.
- Hasta 5 intereses.

Criterios de aceptacion:

- El perfil puede completarse en menos de 2 minutos.
- Email y telefono no se muestran publicamente por defecto.
- El usuario puede participar sin perfil publico.

### QR de acceso y check-in

Cada inscripcion tiene token unico.

Criterios de aceptacion:

- El administrador puede escanear QR desde una ruta privada.
- Un QR valido cambia la inscripcion a acreditada.
- Un segundo escaneo del mismo QR muestra que ya fue acreditado.
- El dashboard refleja inscritos y acreditados.

### Directorio del evento

Directorio privado de asistentes del mismo evento.

Criterios de aceptacion:

- Solo usuarios inscritos pueden acceder.
- Solo aparecen perfiles con networking activo.
- Permite busqueda por nombre.
- Permite filtro por industria o interes.
- Cada perfil tiene accion "Conectar".

### Solicitud de conexion

Solicitud entre dos asistentes dentro del mismo evento.

Criterios de aceptacion:

- No se puede solicitar conexion a uno mismo.
- No se puede duplicar una solicitud pendiente o aceptada.
- Estados: pendiente, aceptada, rechazada, cancelada.
- Al aceptar, se permite compartir datos autorizados.
- No hay chat en el MVP.

## Puede esperar

- Dashboard avanzado.
- Notificaciones push.
- Agenda del evento.
- Pagos.
- Chat en tiempo real.
- Algoritmo ML de match.
- App mobile nativa.
- Multi-organizacion sofisticada.

## MVP recomendado por fases

### Fase A: Operacion de evento

Admin login, crear evento, publicar link, inscripcion, QR y check-in.

### Fase B: Networking basico

Perfil, directorio privado, filtros y solicitud de conexion.

### Fase C: Datos y mejora

Dashboard basico, CSV, match simple explicable y emails transaccionales.
