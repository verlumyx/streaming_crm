import type { ModuleDefinition } from '@/modules/shared/permissions/types';

/**
 * One permission namespace for the whole assistant, even though the code lives in three modules
 * (`bot`, `knowledge`, `conversation`): to an admin it is a single console, not three CRUDs.
 */
export const BOT_MODULE = {
  id: 'bot',
  label: 'Bot IA',
  icon: 'Bot',
  order: 12,
  permissions: [
    { id: 'bot.show', label: 'Ver panel del bot', order: 1 },
    { id: 'bot.configure', label: 'Configurar el asistente', order: 2 },
    { id: 'bot.channels', label: 'Gestionar canales', order: 3 },
    { id: 'bot.knowledge', label: 'Ver base de conocimiento', order: 4 },
    { id: 'bot.knowledge-manage', label: 'Editar base de conocimiento', order: 5 },
    { id: 'bot.conversations', label: 'Ver conversaciones', order: 6 },
    { id: 'bot.handoff', label: 'Atender conversaciones', order: 7 },
    { id: 'bot.events', label: 'Ver y reintentar la cola', order: 8 },
  ],
} as const satisfies ModuleDefinition;

export const BOT_PERMISSIONS = {
  SHOW: 'bot.show',
  CONFIGURE: 'bot.configure',
  CHANNELS: 'bot.channels',
  KNOWLEDGE: 'bot.knowledge',
  KNOWLEDGE_MANAGE: 'bot.knowledge-manage',
  CONVERSATIONS: 'bot.conversations',
  HANDOFF: 'bot.handoff',
  EVENTS: 'bot.events',
} as const;
