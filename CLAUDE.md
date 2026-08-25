# SACDA — Sistema de Administración Casa del Alfarero

## 1. Contexto y rol

Eres un ingeniero de software senior full-stack. Vas a construir, de forma iterativa y modular, una aplicación web interna de gestión para **Casa del Alfarero**, una iglesia cristiana. La aplicación es de **uso exclusivo para líderes y administradores** (no es pública para toda la congregación) y digitaliza procesos que hoy se manejan manualmente o por WhatsApp.

Antes de escribir código, lee todo este documento, y si algo no está claro, pregúntame antes de asumir.

## 2. Stack técnico

* **Frontend + Backend**: Next.js (App Router), TypeScript.
* **Hosting**: Vercel.
* **Base de datos, autenticación y storage liviano**: Supabase (Postgres + Supabase Auth + Supabase Storage).
* **Estilos**: Tailwind CSS.
* **PWA**: la aplicación debe poder instalarse desde el navegador tanto en celular (Android/iOS) como en escritorio (manifest.json, service worker, iconos).
* **Idioma de la interfaz**: español (Perú).
* **Notificaciones**: sistema multicanal — dentro de la app (in-app), por correo (SendGrid o Amazon SES) y por WhatsApp (API de WhatsApp Business / Meta Cloud API, usando plantillas aprobadas). Cada usuario elige su canal preferido por tipo de notificación.
* **Archivos pesados (video, audio largo)**: NO se guardan en Supabase Storage. Se manejan como enlaces embebidos a Google Drive / OneDrive (el usuario pega el enlace, el sistema detecta la plataforma y genera un reproductor embebido si es posible). Supabase Storage se usa solo para archivos livianos (imágenes, PDFs pequeños, documentos de texto).

## 3. Principio arquitectónico central: cuenta única, roles acumulables

Este es el concepto más importante del sistema y debe reflejarse desde el modelo de datos:

* Toda persona se registra primero como **congregante** (una ficha con sus datos: nombre, DNI, contacto, fecha de nacimiento, ministerio). En este punto **no necesita cuenta de acceso**.
* Cuando esa persona necesita entrar al sistema, se le crea una **cuenta de acceso vinculada a esa misma ficha** — nunca se duplica el registro de la persona.
* Los **roles son etiquetas acumulables**, no una jerarquía.
* Diseña el modelo de datos con una tabla central `personas` separada de una tabla `cuentas`/`auth` (vinculada 1 a 1 opcionalmente, vía `auth.users` de Supabase), y una tabla `roles_asignados` tipo muchos-a-muchos entre persona y rol.
* El sistema de permisos debe ser por rol y por módulo, no por "tipo de usuario" fijo.

## 4. Patrones transversales

1. **Rotación de encargados por turno**: lista de personas asignadas a un rol dentro de un ministerio, se distribuyen automáticamente por fecha en un patrón rotativo, y se notifica a quien le toca.
2. **Tareas con flujo de aprobación**: tarea generada → asignada a una persona → con plazo → la persona entrega → un encargado aprueba o rechaza → si se aprueba, se distribuye automáticamente a quien corresponda.

Construye estos dos patrones como módulos/servicios genéricos reutilizables, no como lógica duplicada.

## 5. Módulos funcionales

### Fase 1 — Base del sistema

**5.1 Autenticación y Roles**
* Modelo de personas/cuentas/roles descrito en la sección 3.
* CRUD de congregantes: nombre, DNI, contacto, fecha de nacimiento, ministerio.
* Panel de permisos por rol y por módulo.
* Historial de auditoría (quién cambió qué y cuándo), especialmente para Finanzas.

**5.2 Gestión de Miembros**
* Vista de cumpleaños próximos, con notificación automática anticipada (configurable) al rol de Diseño Gráfico.
* Registro de ceremonias especiales: bautismos, dedicaciones, bodas.
* Registro de visitas/nuevos convertidos: seguimiento de si volvieron y quién los contactó.
* Registro de ausencias, con alerta a un líder para seguimiento.
* Búsqueda y filtros (ministerio, edad, estado).

### Fase 2 — Organización y comunicación

**5.3 Ministerios y Grupos**
* Estructura genérica y reutilizable (no crear un módulo distinto por ministerio).
* Un grupo puede tener sub-grupos.
* Miembros asignados por grupo, calendario propio, material adjunto.
* Notificación automática solo a integrantes del grupo.
* Campo opcional de enlace a grupo de WhatsApp externo.

**5.4 Calendario y Eventos**
* Servicios recurrentes (viernes y domingo).
* Actividades especiales recurrentes (ej. Santa Cena el primer día de cada mes).
* Eventos únicos/anuales.
* Los eventos pueden disparar automáticamente tareas en otros módulos.
* Canal configurable por usuario y por tipo de notificación.

**5.5 Notificaciones**
* Servicio central que consumen los demás módulos.
* Tipos: turno asignado, plazo de diseño, cumpleaños próximo, ausencia detectada, mantenimiento próximo, reunión de grupo, solicitud de venta aprobada/rechazada.

### Fase 3 — Servicio y contenido

**5.6 Programación de Servidores y Turnos**
* Roles configurables por fecha dentro del servicio (deben poder agregarse sin cambiar código).
* Asignación de una o más personas por rol; una persona puede tener más de un rol el mismo día.
* Aplica el patrón de rotación automática para multimedia y limpieza.
* Cada servidor sube el material correspondiente a su rol.

**5.7 Capacitación**
* Repositorio de tutoriales prácticos por área de servicio.
* Etiqueta de destino en cada material: pantalla principal vs. redes sociales.
* Sugerencia automática de tutorial a un servidor nuevo antes de su primer turno.
* Aplica el patrón de tareas con aprobación.

**5.8 Tareas de Diseño Gráfico**
* Tareas generadas automáticamente desde el Calendario o solicitadas manualmente.
* Flujo: asignación → plazo → entrega → aprobación → distribución automática a Multimedia e Impresiones.

### Fase 4 — Administración

**5.9 Finanzas**
* Registro de aportes por congregante: ofrendas, diezmos, pactos, otros.
* Reportes por persona (mensual/anual).
* Registro de gastos generales por concepto, fecha, categoría.
* Reportes exportables (Excel/PDF).
* Registro de ingresos/gastos por actividad específica, con balance propio.
* Permisos restringidos.

**5.10 Inventario**
* Registro de bienes (instrumentos, parlantes, equipos): fecha de compra, vida útil estimada, estado.
* Alertas automáticas de mantenimiento programado.

**5.11 Solicitudes de Venta / Uso de Espacio**
* Un hermano solicita vender algo al finalizar el culto, indicando fecha y detalle.
* Aplica el patrón de tareas con aprobación.
* Flujo de aprobación por un encargado.
* Aprobada, queda registrada en el Calendario y notifica a organizadores.
* Campo opcional de comisión/monto (desactivado por defecto), conectable a Finanzas si se activa.

### Fase 5 — Formación

**5.12 Academia**
* Gestión de estudiantes, exámenes y estado (aprobado/desaprobado/pendiente).
* El congregante con cuenta ve un resumen de su propio progreso desde su login.
* Existe un Excel previo con 46 resúmenes de exámenes como referencia.

### Transversal

**5.13 Panel General (Dashboard)**
* Pantalla de entrada: quién sirve hoy, tareas pendientes, cumpleaños próximos, saldo de finanzas, mantenimientos próximos.
* Adaptado a los roles activos del usuario.

## 6. Fuera de alcance inicial

No implementar salvo que se pida explícitamente: peticiones de oración, testimonios, consejería/citas, directorio rápido, encuestas, multi-sede, modo offline avanzado, exportación/backup automatizado.

## 7. Requisitos no funcionales

* Acceso restringido: sin registro público.
* Responsive: celular y escritorio.
* Español como único idioma.
* Manejo de errores claro en formularios, mensajes en español.
* Datos sensibles (finanzas, ausencias) respetan permisos por rol.

## 8. Cómo trabajar

1. Antes de generar código, proponer el esquema de base de datos para la Fase activa y esperar confirmación.
2. Construir por fases, en el orden sugerido, entregando algo funcional al final de cada fase.
3. Usar migraciones de Supabase versionadas.
4. Explicar decisiones técnicas en español y términos simples.
5. Si una funcionalidad es ambigua, preguntar antes de asumir — especialmente en flujos de aprobación y permisos.
