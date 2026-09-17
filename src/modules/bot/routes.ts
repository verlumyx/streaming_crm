import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

const base = (companyId: string) => `/${companyId}/bot`;

export const botRoutes = {
  index: (companyId: string) => base(companyId),
  settings: (companyId: string) => `${base(companyId)}/settings`,
  channels: (companyId: string, query?: RouteQuery) => withQuery(`${base(companyId)}/channels`, query),
  channelCreate: (companyId: string) => `${base(companyId)}/channels/create`,
  channelEdit: (companyId: string, id: string) => `${base(companyId)}/channels/${id}/edit`,
  knowledge: (companyId: string, query?: RouteQuery) => withQuery(`${base(companyId)}/knowledge`, query),
  knowledgeCreate: (companyId: string) => `${base(companyId)}/knowledge/create`,
  knowledgeShow: (companyId: string, id: string) => `${base(companyId)}/knowledge/${id}`,
  knowledgeEdit: (companyId: string, id: string) => `${base(companyId)}/knowledge/${id}/edit`,
  conversations: (companyId: string, query?: RouteQuery) => withQuery(`${base(companyId)}/conversations`, query),
  conversationShow: (companyId: string, id: string) => `${base(companyId)}/conversations/${id}`,
  events: (companyId: string, query?: RouteQuery) => withQuery(`${base(companyId)}/events`, query),
};

/** Public webhook URLs. The channel id is the path segment: Meta's GET handshake carries no metadata. */
export const botWebhookPaths = {
  whatsapp: (channelId: string) => `/api/bot/webhooks/whatsapp/${channelId}`,
  telegram: (channelId: string) => `/api/bot/webhooks/telegram/${channelId}`,
};
