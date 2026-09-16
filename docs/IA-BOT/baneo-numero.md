**Sí, existe un riesgo real de bloqueo permanente o temporal.**

Evolution API es una solución **no oficial** que se apoya en librerías de ingeniería inversa (principalmente Baileys) para emular una sesión de WhatsApp Web. Al no utilizar la API oficial de Meta (WhatsApp Cloud API o On-Premises), infringe los Términos del Servicio de la plataforma.

---

### ¿Por qué detecta y bloquea WhatsApp estos números?

Meta cuenta con sistemas automatizados heurísticos y de inteligencia artificial para identificar clientes no legítimos:

1. **Reportes de usuarios (el factor más crítico):** Si el bot contacta a personas que marcan el chat como *Spam* o *Bloquear*, el algoritmo banea el número de forma casi inmediata.
2. **Discrepancias de protocolo y huella técnica:** Meta actualiza con frecuencia los protocolos de WhatsApp Web. Si la emulación de Evolution API presenta discrepancias temporales en la sincronización de sockets, firmas criptográficas o presencia en línea, la cuenta puede ser marcada.
3. **Comportamiento no humano:** Enviar mensajes instantáneamente, sin pausas, sin emular el evento de "escribiendo..." (*composing*) o disparar múltiples mensajes por segundo.
4. **Números nuevos (Chips recién activados):** Un número que acaba de registrarse y empieza de inmediato a enviar o recibir un volumen anormal de mensajes carece de "reputación" y tiene una tolerancia mínima a filtros automáticos.

---

### Escenarios de riesgo: Inbound vs. Outbound

| Flujo | Nivel de riesgo | Descripción |
| --- | --- | --- |
| **Inbound (El usuario escribe primero)** | **Bajo a Moderado** | Si la IA solo responde preguntas de personas que voluntariamente iniciaron el chat (soporte técnico, cotizaciones, FAQs), el riesgo disminuye drásticamente porque los usuarios no suelen reportar el número. |
| **Outbound / Difusión masiva** | **Crítico (Baneo casi seguro)** | Enviar mensajes proactivos a listas de contactos, recordatorios fríos o promociones sin consentimiento explícito suele culminar en baneo en cuestión de horas o días. |

---

### Medidas para minimizar el riesgo con Evolution API

Si decides implementarlo para tu caso de uso, aplica estas prácticas:

* **Emula comportamiento humano:** Configura en Evolution API los retrasos de tipeo (`delay` y eventos `presence_update: composing`) antes de emitir cada mensaje generado por la IA.
* **Nunca uses el número principal o comercial del negocio:** Emplea líneas secundarias de contingencia. Asume que cualquier número en una API no oficial puede perderse en cualquier momento.
* **Proceso de calentamiento (*Warm-up*):** Comienza interactuando orgánicamente con números de confianza durante 2 a 3 semanas (llamadas reales, conversaciones normales) antes de conectarlo a la automatización.
* **Limita el bot a flujos 100% reactivos:** La IA debe responder únicamente a mensajes entrantes y no iniciar conversaciones no solicitadas.

---

> **¿Cuándo migrar a la WhatsApp Cloud API oficial?**
> Si el flujo es para un entorno en producción donde perder el número paralizaría ventas o atención al cliente, la única vía con **0% de riesgo de baneo por protocolo** es la API oficial de Meta (WhatsApp Cloud API).