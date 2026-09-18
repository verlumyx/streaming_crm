# Bot IA en streaming_crm: arquitectura implementada

> Los demás documentos de `docs/IA-BOT/` describen el proyecto de referencia `chatIA`
> (LangChain + Supabase). **Este documento describe lo que realmente está implementado en
> `streaming_crm`**: Next.js App Router + Drizzle + Postgres + `@google/genai`, sin LangChain.

Cubre los tres módulos nuevos, las integraciones con Meta (WhatsApp Cloud API), Telegram y Gemini,
y el recorrido completo archivo por archivo desde que Meta golpea el webhook hasta que el cliente
recibe la respuesta.

---

## 1. Los tres módulos nuevos

El asistente no es un módulo: son tres, con responsabilidades separadas y un solo namespace de
permisos (`bot.*`), porque para el administrador es una sola consola.

| Módulo | Carpeta | Responsabilidad |
|---|---|---|
| **bot** | `src/modules/bot/` | Canales, credenciales, cola durable de eventos, orquestación del agente, herramientas, adaptadores de Gemini. |
| **conversation** | `src/modules/conversation/` | Contactos, hilos, mensajes, handoff a humano, bloqueo de contactos, estados de entrega. |
| **knowledge** | `src/modules/knowledge/` | Base de conocimiento: documentos, troceado, embeddings, búsqueda vectorial (RAG). |

Rutas de UI (todas bajo `/{companyId}/bot`, ver `src/modules/bot/routes.ts`):

| Ruta | Permiso | Para qué |
|---|---|---|
| `/bot` | `bot.show` | Panel: estado del asistente, alta inicial. |
| `/bot/settings` | `bot.configure` | Modelo, temperatura, prompt de negocio, instrucciones de pago, límites. |
| `/bot/channels` | `bot.channels` | Alta/edición de números de WhatsApp y bots de Telegram. |
| `/bot/knowledge` | `bot.knowledge` / `bot.knowledge-manage` | Documentos y su estado de indexación. |
| `/bot/conversations` | `bot.conversations` / `bot.handoff` | Bandeja de hilos, tomar el control, responder como humano. |
| `/bot/events` | `bot.events` | Cola: pendientes, fallidos, cola muerta, reintentar. |

Los permisos se declaran en `src/modules/bot/permissions.ts` y se siembran con `pnpm db:seed`.

### Tablas

| Tabla | Modelo | Notas clave |
|---|---|---|
| `app_bot_settings` | `bot/models/bot-settings.model.ts` | Una fila por empresa. Incluye `agent_user_id`: el usuario de sistema con el que el bot firma sus ventas. |
| `app_bot_channels` | `bot/models/bot-channel.model.ts` | Credenciales **cifradas AES-256-GCM** (`@/modules/shared/crypto`). Único global por `(provider, external_id)`. |
| `app_bot_events` | `bot/models/bot-event.model.ts` | Cola durable. Único por `(provider, external_event_id)` = idempotencia del proveedor. |
| `app_bot_contacts` | `conversation/models/conversation.model.ts` | Quién escribe. Se enlaza a `app_clients` por teléfono. |
| `app_bot_conversations` | idem | Un hilo abierto por contacto (índice único parcial `status = 'open'`). Código `CNV000001`. |
| `app_bot_messages` | idem | Todo el hilo, incluidas las llamadas a herramientas. Único por `(company_id, external_message_id)`. |
| `app_knowledge_documents` | `knowledge/models/knowledge.model.ts` | Fuente de verdad. Código `DOC000001`, hash del contenido, estado de ingesta. |
| `app_knowledge_chunks` | idem | Índice derivado: `vector(768)` + índice HNSW coseno. Es la única excepción deliberada a `no-delete-policy`. |

---

## 2. Integración con Meta (WhatsApp Cloud API)

### Alta del canal

El administrador crea el canal en `/bot/channels/create` con el `phone_number_id`, el token de
acceso, el *app secret* y un *verify token* que él inventa. `whatsappWebhookUrl()`
(`src/app/[companyId]/bot/channels/actions.ts`) le devuelve la URL que debe pegar en el panel de
Meta:

```
https://<NEXT_PUBLIC_APP_URL>/api/bot/webhooks/whatsapp/{channelId}
```

**Por qué el id del canal va en la URL:** el handshake `GET` de Meta no lleva `phone_number_id`, así
que sin el segmento no habría forma de saber contra qué *verify token* comparar. El id no es un
secreto: la barrera real es la firma HMAC de cada `POST`.

### Handshake y firma

`src/app/api/bot/webhooks/whatsapp/[channelId]/route.ts`:

- `GET` → compara `hub.verify_token` en tiempo constante y devuelve `hub.challenge`.
- `POST` → lee el cuerpo **crudo** (`request.text()`) porque `X-Hub-Signature-256` es un HMAC de los
  bytes exactos: re-serializar el JSON parseado nunca coincide. La verificación vive en
  `MetaCloudChannelGateway.verify()`, que es una función pura y por eso está cubierta con payloads
  reales en `tests/unit/modules/bot/channel-gateways.test.ts`.

### Envío

`MetaCloudChannelGateway.send()` hace `POST /{apiVersion}/{phone_number_id}/messages`. Los errores
se envuelven en `ChannelSendError`, que expone dos decisiones de negocio:

- `retryable` → sólo 5xx y 429. Un 4xx significa que la petición está mal y reintentarla sólo
  spamearía al cliente.
- `outsideServiceWindow` → código `131047`: pasaron más de 24 h desde el último mensaje del cliente
  y Meta ya no acepta texto libre, hace falta una plantilla aprobada.

### Estados de entrega

Meta reenvía por el mismo webhook los `statuses` (`delivered`, `read`, `failed`). El handler los
pasa a `messageStatusService`, que actualiza `app_bot_messages.status` buscando por
`external_message_id`. Por eso un mensaje enviado puede verse después como `delivered` en la consola.

---

## 3. Integración con Telegram

Diferencias respecto a Meta, todas en `src/modules/bot/channels/telegram/telegram.gateway.ts` y
`src/app/api/bot/webhooks/telegram/[channelId]/route.ts`:

| Aspecto | WhatsApp | Telegram |
|---|---|---|
| Identidad del canal | `phone_number_id` que copia el admin | Se descubre con `getMe` al dar de alta el token (`LiveChannelIdentityResolver`) |
| Autenticación del webhook | HMAC `X-Hub-Signature-256` | `X-Telegram-Bot-Api-Secret-Token`: Telegram **no firma** nada, así que el secreto ES la autenticación. Se genera con `randomBytes(32)` al crear el canal |
| Registro del webhook | Manual en el panel de Meta | Automático: `registerTelegramWebhook()` llama a `setWebhook` (acción `refreshTelegramWebhookAction`) |
| Idempotencia | `wamid.…` | `tg:{botId}:{updateId}` |
| Acuses de entrega | Sí | No existen: un 200 de `sendMessage` es la única confirmación |

Ambos gateways implementan el mismo puerto `ChannelGateway`
(`src/modules/bot/channels/channel-gateway.ts`) y normalizan a `InboundMessage`. **Todo lo que está
aguas abajo del gateway desconoce por completo si el mensaje vino de WhatsApp o de Telegram.**

---

## 4. Integración con la IA

### Puertos, no SDK

Los servicios nunca importan el SDK de un proveedor. Dependen de dos interfaces declaradas en
`src/modules/bot/infrastructure/ai-ports.ts`:

- `ChatModel.generate(ChatRequest): ChatResult` — texto + `functionCalls` + consumo de tokens.
- `EmbeddingModel` — `embedDocuments` / `embedQuery`.

Esto es lo que permite que **ninguna prueba salga a la red**: `tests/unit/modules/bot/fake-ai.ts`
inyecta un modelo con guion prefijado. Y es también lo que permite cambiar de proveedor sin tocar un
solo servicio: hoy el único adaptador es Gemini, pero el puerto ya es neutral.

Cada proveedor identifica sus llamadas a herramientas a su manera, así que una `ChatFunctionCall`
lleva los dos campos, ambos opcionales y **usados sólo por el adaptador que los emitió**:

| Campo | Proveedor | Para qué |
|---|---|---|
| `thoughtSignature` | Gemini | Firma la llamada; reenviarla sin ella rechaza la conversación entera. |
| `callId` | OpenAI / Azure OpenAI | Empareja el resultado con su llamada **por id, no por nombre** — la misma herramienta puede ejecutarse dos veces en un turno. |

Ninguno de los dos se persiste: el historial que se reproduce en cada turno es sólo texto
(`toChatTurns`), así que ambos viven dentro de una única ejecución del runner.

### El adaptador de chat

`src/modules/bot/infrastructure/gemini-chat.client.ts`:

- **Cadena de respaldo**: recorre `[modelo de la empresa, ...BOT_CHAT_MODELS]` y salta al siguiente
  sólo si el error es de cuota o saturación (`429|RESOURCE_EXHAUSTED|quota|503|UNAVAILABLE|overloaded`).
  Cualquier otro error fallaría igual con el siguiente modelo, así que corta.
- **`thoughtSignature`**: los modelos con *thinking* firman cada `functionCall` y **rechazan la
  conversación entera** (`INVALID_ARGUMENT`) si la llamada se reenvía sin su firma. El adaptador la
  extrae, la devuelve en el `part` al repetir la llamada, y **la elimina si responde un modelo de
  respaldo**, porque una firma sólo vale para el modelo que la emitió.
- Las partes marcadas como `thought` no entran en el texto que se le envía al cliente.
- **Recorta el esquema de cada herramienta** al subconjunto OpenAPI 3.0 que Gemini acepta
  (`gemini-schema.ts`), justo antes de enviar. La herramienta declara JSON Schema puro y no sabe
  nada del proveedor.

### El loop de agente (function calling)

`src/modules/bot/services/bot-agent-runner.service.ts` es el bucle *razonar y actuar*:

1. Pregunta al modelo con el historial + las declaraciones de herramientas.
2. Si no pidió herramientas → devuelve el texto y termina.
3. Si pidió herramientas → las ejecuta, mete `functionCall` + `functionResponse` en el contexto y
   vuelve al paso 1. El identificador que trajo la llamada (`thoughtSignature` o `callId`) viaja de
   vuelta con ella **y con su resultado**, sin que el runner sepa a qué proveedor pertenece.
4. Tope `maxToolIterations` (config por empresa, por defecto 6) para que un modelo atascado no queme
   la cuota ni cuelgue el worker.

El modelo que respondió queda fijado para las iteraciones siguientes: volver al primero rompería las
firmas y además reintentaría un modelo que ya estaba sin cuota.

### Las herramientas

`src/modules/bot/tools/`. El registro (`tool-registry.ts`) **es la frontera de seguridad**: no hay
herramienta de SQL libre y ninguna puede leer `app_accounts` (credenciales y costos).

| Herramienta | Archivo | Muta | Condición |
|---|---|---|---|
| `buscar_informacion` | `knowledge.tool.ts` | no | siempre |
| `listar_catalogo` | `catalog.tools.ts` | no | siempre |
| `consultar_disponibilidad` | `catalog.tools.ts` | no | siempre |
| `consultar_mi_cuenta` | `client.tools.ts` | no | siempre |
| `consultar_mis_ventas` | `sale.tools.ts` | no | siempre |
| `registrar_cliente` | `client.tools.ts` | sí | `autoCreateClient` |
| `crear_venta` | `sale.tools.ts` | sí | `autoCreateSale` |
| `escalar_a_humano` | `handoff.tool.ts` | sí | `handoffEnabled` |

Detalles que importan:

- El esquema Zod de cada herramienta se usa **dos veces**: `toDeclaration()` lo emite como JSON Schema
  tal cual, y el runner lo usa para validar lo que vuelve. Recortarlo es trabajo del adaptador,
  porque lo que Gemini rechaza (`$defs`, `additionalProperties`) es justo parte de lo que OpenAI
  necesita para el modo `strict`.
- `ToolContext` lleva `companyId`, `contactId` y `clientId` **del evento en curso, nunca de los
  argumentos del modelo**. Eso hace que un *prompt injection* del tipo "consulta la empresa X" sea
  estructuralmente imposible, no simplemente desaconsejado.
- `BotToolRunner` no lanza excepciones por fallos esperados: herramienta inexistente, argumentos
  inválidos o regla de negocio incumplida vuelven al modelo como `{ error: … }` para que se disculpe
  o pregunte de nuevo. Un bug real sí se propaga y devuelve el evento a la cola.
- Cada herramienta que muta corre en **su propia transacción**; las de lectura usan el ejecutor del
  worker.
- El resultado se trunca a 4 000 caracteres antes de entrar al prompt.

### RAG

- **Ingesta** (`knowledge/services/knowledge-ingest.service.ts`): corre en el worker, nunca en una
  petición, porque embeber un documento son varios segundos de HTTP y la regla del proyecto es que
  una transacción no abarca I/O de red. Trocea con un *recursive character splitter* propio
  (1 000 caracteres, 150 de solape) y reescribe los chunks del documento.
- **Recuperación** (`knowledge-retrieve.service.ts`): embebe la consulta, pide `topK × 2` vecinos por
  coseno (índice HNSW) y filtra por `retrievalMinScore` **en memoria** — un `WHERE` sobre la
  similitud calculada impediría a Postgres usar el índice.
- Los fragmentos se devuelven envueltos en `<fragmento fuente="…">` por `buildKnowledgeBlock()`, para
  que un intento de inyección escrito dentro de un documento se lea como cita, no como orden.
- Documentos y consultas se embeben con *task types* distintos (`RETRIEVAL_DOCUMENT` /
  `RETRIEVAL_QUERY`), que es lo que el modelo espera y mejora el ranking.

### El prompt de sistema

`src/modules/bot/domain/system-prompt.ts` lo construye **de cero en cada turno** y es una función
pura, así que su contenido se verifica en tests. Las instrucciones del administrador van **al final**
y dentro de un bloque `<instrucciones_del_negocio>` explícitamente subordinado a las reglas de
arriba.

---

## 5. Del webhook a la respuesta, archivo por archivo

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as 📱 Cliente
    participant Meta as ☁️ Meta Cloud API
    participant Route as route.ts (webhook)
    participant GW as MetaCloudChannelGateway
    participant Enq as BotEventEnqueueService
    participant DB as 🗄️ app_bot_events
    participant Worker as bot-worker / after()
    participant Proc as BotProcessEventService
    participant Runner as BotAgentRunner
    participant Gemini as 🧠 Gemini
    participant Tools as BotToolRunner

    Cliente->>Meta: "¿Tienes Netflix?"
    Meta->>Route: POST /api/bot/webhooks/whatsapp/{channelId}
    Route->>Route: rate limit + firma HMAC
    Route->>GW: parse(payload)
    GW-->>Route: InboundMessage[]
    Route->>Enq: execute(messages, channel)
    Enq->>DB: INSERT ... ON CONFLICT DO NOTHING
    Route-->>Meta: 200 {status:"queued"}
    Note over Route,Worker: el 200 ya salió; el trabajo pesado va después
    Route->>Worker: after(drainQueue)
    Worker->>DB: UPDATE ... FOR UPDATE SKIP LOCKED
    DB-->>Worker: evento reclamado
    Worker->>Proc: execute(event)
    Proc->>Proc: resuelve contacto + hilo, guarda mensaje, 5 filtros de silencio
    Proc->>Runner: run(prompt, historial, herramientas)
    loop hasta texto o maxToolIterations
        Runner->>Gemini: generateContent
        Gemini-->>Runner: functionCalls
        Runner->>Tools: ejecuta cada una
        Tools-->>Runner: resultados
    end
    Runner-->>Proc: texto final
    Proc->>Meta: POST /messages (troceado)
    Meta->>Cliente: respuesta
    Meta->>Route: status "delivered"
```

### Fase 1 — Ingesta (síncrona, < 50 ms)

`src/app/api/bot/webhooks/whatsapp/[channelId]/route.ts`

1. **Valida el segmento**: `isUuid(channelId)`, si no → 404.
2. **Rate limit** en memoria: `webhookRateLimiter.hit('wa:{channelId}')` — 120 peticiones por minuto
   y canal (`infrastructure/bot-rate-limits.ts`). Si se pasa → 429 con `Retry-After`.
3. **Cuerpo crudo** con `request.text()`.
4. **Carga el canal activo** con credenciales descifradas:
   `DrizzleBotChannelRepository.findActiveWithCredentials()`.
5. **Verifica la firma**: `gateway.verify()`; si falla → 401 y no se toca la base.
6. **Normaliza**: `gateway.parse()` → `{ messages, statuses }`.
7. **Acuses de entrega**: `messageStatusService.execute()` actualiza los mensajes ya enviados.
8. **Encola**: `BotEventEnqueueService.execute()` inserta una fila por mensaje con
   `ON CONFLICT (provider, external_event_id) DO NOTHING` → un reintento de Meta es un no-op.
9. **Responde 200** con `{ queued, duplicated }`.
10. **`scheduleDrain()`** (`infrastructure/schedule-drain.ts`) programa el drenaje con `after()` de
    Next, es decir **después** de haber respondido. Si no hay contexto de petición (tests, scripts)
    no pasa nada: el worker es el drenaje autoritativo.

> Si algo de la fase 1 revienta, el handler devuelve **500 a propósito**: Meta reintenta con backoff
> y el mensaje no se pierde.

### Fase 2 — Reclamo del evento

`BotQueueDrainService.execute(batchSize)` → `DrizzleBotEventRepository.claim()`:

```sql
update app_bot_events set status='processing', attempts=attempts+1, locked_by=…
where id in (
  select id from app_bot_events
  where status in ('pending','failed') and available_at <= now() and attempts < max_attempts
  order by created_at for update skip locked limit $1
)
```

`FOR UPDATE SKIP LOCKED` es lo que permite que el worker, el `after()` del webhook y el endpoint de
cron corran a la vez sin coordinarse.

### Fase 3 — Procesamiento

`src/modules/bot/services/bot-process-event.service.ts`, en orden:

1. `hasAnsweredEvent(event.id)` — si ya se envió una respuesta para este evento, **no se contesta dos
   veces** (entrega at-least-once del proveedor, respuesta at-most-once al cliente).
2. Carga `settings` y `channel`; si falta alguno → `discarded`.
3. `conversations.resolveService` — toma primero un **advisory lock** sobre el contacto
   (`pg_advisory_xact_lock`), para que dos mensajes con un segundo de diferencia no creen dos
   conversaciones ni entrelacen el historial. Resuelve o crea contacto e hilo abierto, y enlaza el
   contacto con un cliente del CRM **sólo si exactamente un cliente activo tiene ese teléfono**: con
   dos coincidencias el bot no adivina.
4. Guarda el mensaje entrante (`appendMessage`, idempotente por `external_message_id`).
5. **Cinco razones para guardar y callar**, en orden de lo poco que cuestan: contacto bloqueado,
   hilo en manos de un humano, asistente inactivo, mensaje no textual, límite diario del contacto.
6. Arma el contexto: herramientas según la configuración, `ToolContext`, prompt de sistema,
   historial (`historyWindow` mensajes, de más viejo a más nuevo) y el cliente del CRM si lo hay.
7. `BotAgentRunner.run(...)` → loop de razonamiento con herramientas.
8. Persiste cada `ToolRun` como mensaje `role='tool'` (auditoría de lo que hizo el bot).
9. Si no hubo texto → `warnOutOfService()`: avisa al cliente y escala a humano.
10. `reply()`: trocea con `chunkMessage(texto, maxMessageLength - 96)`, y **por cada trozo** guarda el
    mensaje en `queued`, lo envía y lo marca `sent` con su id externo. Si el envío falla, marca
    `failed`, anota el error en el canal y decide según `ChannelSendError.retryable`.

### Fase 4 — Cierre

`BotQueueDrainService` marca el evento `completed`, `discarded`, o `failed`/`dlq` con backoff
`2^intentos × 15 s` si el procesamiento lanzó.

---

## 6. La cola: garantías

| Riesgo | Mecanismo | Dónde |
|---|---|---|
| El proveedor reenvía el mismo mensaje | Único `(provider, external_event_id)` | `bot-event.model.ts` |
| Dos workers toman el mismo evento | `FOR UPDATE SKIP LOCKED` | `drizzle-bot-event.repository.ts` |
| El worker muere a mitad | `reclaimStuck()` devuelve a `pending` lo que lleva bloqueado > 10 min | worker, cada 30 ciclos |
| Fallo transitorio del modelo | Reintento con backoff exponencial, hasta `max_attempts` (5) | `markFailed()` |
| Fallo permanente | Estado `dlq` + aviso al cliente + escalado a humano | `warnOutOfService()` |
| Se responde dos veces | `hasAnsweredEvent()` antes de llamar al modelo | `bot-process-event.service.ts` |
| Se duplica el mensaje entrante al reintentar | `ON CONFLICT (company_id, external_message_id) DO NOTHING` | `drizzle-conversation.repository.ts` |

Estados de `app_bot_events`: `pending → processing → completed | discarded | failed → dlq`.

---

## 7. Cómo se ejecuta

Tres disparadores, **una sola implementación** (`BotQueueDrainService`):

| Disparador | Archivo | Para qué |
|---|---|---|
| `after()` del webhook | `infrastructure/schedule-drain.ts` | Latencia: contestar en segundos. Lote de 3. |
| `pnpm bot:worker` | `src/scripts/bot-worker.ts` | El drenaje autoritativo. Reintentos, cola muerta, mantenimiento. Lote de 5 cada 2 s. |
| `POST /api/bot/worker` | `src/app/api/bot/worker/route.ts` | Para cron externo (Vercel Cron, cron-job.org). Exige `Authorization: Bearer $BOT_WORKER_SECRET`; sin secreto configurado responde **404**, no 401. |

El worker además hace mantenimiento cada 30 ciclos: reencola eventos atascados, **devuelve al bot las
conversaciones cuyo handoff venció**, indexa documentos pendientes y rechaza las ventas por aprobar
que nadie pagó (liberando el inventario reservado).

Corre con `tsx --conditions=react-server` porque vive fuera de Next: sin esa condición el guardia
`server-only` que importan los módulos haría explotar el proceso.

### Variables de entorno

| Variable | Para qué |
|---|---|
| `GOOGLE_API_KEY` | Chat y embeddings de Gemini. Sin ella el worker sale con error claro en vez de ensuciar el log cada 2 s. |
| `BOT_CHAT_MODELS` | Cadena de respaldo separada por comas. El modelo de la empresa siempre va primero. |
| `BOT_EMBEDDING_MODEL` / `BOT_EMBEDDING_DIMENSIONS` | Deben coincidir con la columna `vector(768)`; cambiarlas invalida todos los chunks. |
| `BOT_WORKER_SECRET` / `BOT_WORKER_BATCH_SIZE` / `BOT_WORKER_POLL_MS` / `BOT_WORKER_STUCK_MINUTES` | Worker y endpoint de cron. |
| `BOT_STALE_PENDING_TTL_MINUTES` | Cuánto aguanta una venta por aprobar antes de liberar los perfiles. |
| `NEXT_PUBLIC_APP_URL` | Necesaria para registrar el webhook de Telegram. |
| `APP_ENCRYPTION_KEY` | Cifrado de credenciales de canal. Cae a `BETTER_AUTH_SECRET` si falta. |

---

## 8. Qué pasa cuando algo falla

| Falla | Qué ve el cliente | Qué ve el operador |
|---|---|---|
| Modelo sin cuota / caído, con reintentos pendientes | Nada todavía | Evento `failed` con el error, se reintenta |
| Modelo sin cuota en el **último** intento | "Estamos teniendo problemas técnicos…" (`domain/service-notice.ts`) | Evento en `dlq` + conversación escalada a humano con el motivo |
| El modelo entra en bucle de herramientas | El mismo aviso | Conversación escalada, `handoff_reason` explica |
| Herramienta con argumentos inválidos o regla de negocio | El bot se disculpa o repregunta | Mensaje `role='tool'` con el `{error}` |
| Token de WhatsApp vencido / revocado | **Nada**: no hay forma de enviarle un aviso | `app_bot_channels.last_error` = "Authentication Error" y el mensaje queda `failed` |
| Fuera de la ventana de 24 h de WhatsApp | Nada | Error explícito sobre la plantilla aprobada |

El aviso de fuera de servicio se guarda **sin `event_id` a propósito**: si se guardara con él,
`hasAnsweredEvent()` lo tomaría por una respuesta y reencolar el evento desde la consola ya nunca
contestaría al cliente.

Dónde mirar cuando algo no llega, en este orden:

1. `/bot/events` — ¿el evento existe? Si no, el webhook no llegó (túnel caído, URL mal en Meta, firma inválida).
2. Estado del evento — `pending` con el worker parado, `failed`/`dlq` con `last_error`.
3. `/bot/conversations/{id}` — ¿el modelo respondió? ¿el mensaje quedó `queued`, `failed` o `sent`?
4. `/bot/channels` — `last_error` del canal: casi siempre es el token.

---

## 9. Seguridad y multi-tenant

- **`companyId` siempre del runtime**: del segmento de URL en la consola, del canal en el webhook.
  Nunca de la sesión dentro de servicios ni de los argumentos del modelo.
- **Credenciales cifradas** en reposo y jamás serializadas hacia el cliente: los DTO de canal no
  llevan tokens.
- **Comparaciones en tiempo constante** para el verify token, el secreto de Telegram, la firma HMAC y
  el secreto del worker.
- **Defensa contra prompt injection en dos capas**: el prompt lo dice (documentos y mensajes son
  datos, no órdenes) y la arquitectura lo garantiza (no hay herramienta que acepte un `companyId`).
- **El bot firma sus ventas** con un usuario de sistema propio por empresa (`BotSetupService`), con su
  rol `Bot` de permisos mínimos: en la auditoría se distingue qué vendió el bot y qué vendió una persona.
- Las ventas que registra el bot quedan **por aprobar**: reservan el perfil pero no entregan
  credenciales ni generan ingreso hasta que una persona verifica el pago.

---

## 10. Pruebas

| Suite | Qué cubre |
|---|---|
| `tests/unit/modules/bot/channel-gateways.test.ts` | `parse` y `verify` de ambos gateways contra payloads reales (`tests/fixtures/bot/`). |
| `tests/unit/modules/bot/gemini-chat.test.ts` | Firmas de pensamiento, cadena de respaldo, partes de *thought*, recorte del esquema. |
| `tests/unit/modules/bot/gemini-schema.test.ts` | Qué palabras clave de JSON Schema se eliminan y cuáles sobreviven. |
| `tests/unit/modules/bot/agent-runner.test.ts` | El loop: herramientas, errores, tope de iteraciones, consumo de tokens, emparejado llamada↔resultado. |
| `tests/unit/modules/bot/tool-registry.test.ts` | Qué herramientas se exponen según la configuración. |
| `tests/unit/modules/bot/message-chunking.test.ts` | Troceado de respuestas largas. |
| `tests/integration/modules/bot/whatsapp-webhook.test.ts` / `telegram-webhook.test.ts` | Firma, handshake, encolado, idempotencia. |
| `tests/integration/modules/bot/bot-flow.test.ts` | El flujo completo con modelo y gateway falsos: venta, handoff, reintentos, aviso de fuera de servicio, aislamiento entre empresas. |

Ninguna prueba sale a la red: `FakeChatModel` y `FakeEmbeddingModel` (`tests/unit/modules/bot/fake-ai.ts`)
implementan los puertos, y `RecordingGateway` registra lo que se habría enviado.

---

## 11. Deuda conocida

- **La cadena de respaldo tiene un solo modelo.** `BOT_CHAT_MODELS` trae `gemini-2.5-flash-lite` y la
  empresa tiene `chat_model = 'gemini-flash-latest'` en base: si el primero se queda sin cuota, no hay
  a dónde caer. Falta poblar la cadena y llevar el default al código (`DEFAULT_CHAT_MODEL`).
- **Un 401 del proveedor deja el evento en `completed`** aunque el cliente nunca recibió nada: el
  problema desaparece de la bandeja de eventos y sólo queda el `last_error` del canal.
- **El texto del aviso de fuera de servicio es una constante**, no configurable por empresa.
- **Alias `-latest` como modelo principal**: mueven el modelo por debajo sin avisar. Fue exactamente
  lo que introdujo el fallo de `thoughtSignature`.
- Los `ToolRun` sólo se persisten si el turno termina bien: si el modelo falla después de ejecutar
  herramientas, esas ejecuciones no quedan en la auditoría (aunque sus efectos en base sí).
