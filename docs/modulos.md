# Módulos del CRM

> Nota: los marcadores de estado (✅ / 📋 / 🔲) reflejan el estado en que quedó
> cada módulo en el proyecto original `code_base`. En `streaming_crm` todos los
> módulos parten de 🔲 (pendiente): nada está implementado todavía. El orden y
> las prioridades se conservan tal cual como hoja de ruta de la migración.

Módulo 1 · Usuarios y Permisos ✅ Ya implementado — Sistema RBAC dinámico donde el admin crea roles y asigna permisos.
Roles del proyecto: admin, supervisor, agente.

Módulo 2 · Dashboards 🔲 Pendiente — al final — Pantallas de inicio personalizadas por rol. Consume datos de todos los
módulos anteriores.

Módulo 3 · Clientes 📋 Prompt listo — CRUD básico de clientes con nombre, teléfono, correo, estado y notas. Soft delete
preparado para el futuro historial de ventas.

Módulo 4 · Catálogo (Servicios y Planes) 📋 Prompt listo — Servicios (Netflix, HBO, Disney+) y los Planes vendibles que
se construyen sobre ellos (servicio + duración + capacidad + precio + ROI objetivo).

Módulo 5 · Inventario (Cuentas y Perfiles) 📋 Prompt listo — Cuentas reales compradas directo a las plataformas y los
Perfiles que se generan automáticamente al cargar una cuenta.

Módulo 6 · Ventas 🔲 Pendiente — siguiente prioridad — El corazón del sistema. Conecta Cliente + Plan + Perfil. Maneja
ciclo de vida: renovar, reactivar, expulsar, borrar. Aquí se activan todas las reglas de estado de perfil que dejamos
preparadas.

Módulo 7 · Oficina/Finanzas 🔲 Pendiente — Reportes contables (ingresos vs. gastos), análisis de rentabilidad real por
cuenta/producto, gestión de equipo y caja menuda.

Módulo 8 · Soporte (Tickets) 🔲 Pendiente — Canal de comunicación entre roles. Agentes solicitan cuentas al supervisor,
reportan fallas, supervisores reciben y cierran tickets.

Módulo 9 · Sistema y Automatización 🔲 Pendiente — puede ir en paralelo — Log de auditoría inmutable, webhooks a Make.com
para automatizaciones, sistema de notificaciones internas (campanita).

Módulo Cliente (Portal de Autoservicio) 🔲 Aplazado — Lo dejamos fuera de alcance por ahora. Cuando se active, será el
portal para que clientes consulten compras, soliciten renovaciones y reporten problemas.

