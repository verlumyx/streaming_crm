/**
 * What the customer reads when the assistant cannot answer at all — a model outage, an exhausted
 * quota, a tool loop that never produced text. Short and free of technical detail: the reason
 * belongs in the handoff the operator sees, not in the customer's chat.
 */
export const OUT_OF_SERVICE_MESSAGE =
  'Estamos teniendo problemas técnicos con el asistente en este momento 🙏 ' +
  'Ya avisamos a nuestro equipo y una persona te va a responder en breve.';
