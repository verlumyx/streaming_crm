import { z } from 'zod';
import { optionalText, requiredText } from '@/modules/shared/validation/fields';
import { BOT_SETTINGS_STATUSES } from '../models/bot-settings.model';

/** Coerces a checkbox: absent/'' → false, 'on'/'true'/'1' → true. */
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === 'on' || v === 'true' || v === '1');

const boundedNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number({ message: `${label} debe ser un número.` })
    .min(min, `${label} no puede ser menor que ${min}.`)
    .max(max, `${label} no puede ser mayor que ${max}.`);

export const updateBotSettingsSchema = z.object({
  status: z.enum(BOT_SETTINGS_STATUSES, { message: 'El estado no es válido.' }),
  assistantName: requiredText('El nombre del asistente', 100),
  personaPrompt: optionalText('Las instrucciones del negocio', 4000),
  paymentInstructions: optionalText('Las instrucciones de pago', 2000),
  chatModel: requiredText('El modelo de chat', 60),
  temperature: boundedNumber('La temperatura', 0, 2),
  maxToolIterations: boundedNumber('El máximo de iteraciones', 1, 12),
  retrievalTopK: boundedNumber('El número de fragmentos', 1, 20),
  retrievalMinScore: boundedNumber('La similitud mínima', 0, 1),
  historyWindow: boundedNumber('El historial de mensajes', 2, 100),
  handoffEnabled: checkbox,
  handoffMinutes: boundedNumber('Los minutos de atención humana', 5, 1440),
  autoCreateClient: checkbox,
  autoCreateSale: checkbox,
  contactDailyMessageLimit: boundedNumber('El límite diario por contacto', 1, 5000),
});

export type UpdateBotSettingsInput = z.infer<typeof updateBotSettingsSchema>;
