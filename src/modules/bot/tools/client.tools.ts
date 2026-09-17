import { z } from 'zod';
import { createClientContainer } from '@/modules/client/container';
import { createConversationContainer } from '@/modules/conversation/container';
import { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import { uuidv7 } from '@/modules/shared/uuid';
import type { BotTool } from './bot-tool';

const registerSchema = z.object({
  nombre: z.string().min(2).max(150).describe('Nombre y apellido del cliente, tal como lo dio.'),
  correo: z.email().max(255).optional().describe('Correo del cliente, solo si lo proporcionó.'),
});

/**
 * Registers the person writing as a client.
 *
 * The phone is taken from the channel contact, never from the model: letting the model choose it
 * would let a customer claim someone else's number and see their sales.
 */
export const registrarClienteTool: BotTool<typeof registerSchema> = {
  name: 'registrar_cliente',
  description:
    'Registra a la persona con la que hablas como cliente de la empresa. ' +
    'Úsala solo cuando quiera comprar y todavía no esté registrada.',
  schema: registerSchema,
  mutating: true,

  async execute({ nombre, correo }, context) {
    if (context.clientId) {
      const existing = await createClientContainer(context.db).findService.execute(context.clientId, context.companyId);
      return { yaRegistrado: true, codigo: existing.code, nombre: existing.name };
    }

    if (!context.contactPhoneE164) {
      return {
        error: 'sin_telefono',
        mensaje: 'No tengo el teléfono del cliente en este canal. Pídeselo y vuelve a intentarlo.',
      };
    }

    const client = await createClientContainer(context.db).createService.execute(
      new CreateClientCommand(uuidv7(), context.companyId, context.botUserId, nombre, context.contactPhoneE164, correo ?? null, 'Registrado por el asistente.'),
    );

    await createConversationContainer(context.db).repository.linkClient(context.contactId, client.id);
    // The model usually registers and sells in the same turn, so the context must see it now.
    context.clientId = client.id;

    return { yaRegistrado: false, codigo: client.code, nombre: client.name };
  },
};

const accountSchema = z.object({});

/** What the bot may tell this contact about itself: never another client's data. */
export const consultarMiCuentaTool: BotTool<typeof accountSchema> = {
  name: 'consultar_mi_cuenta',
  description:
    'Devuelve si la persona con la que hablas ya es cliente y qué suscripciones tiene vigentes. ' +
    'Úsala cuando pregunte por lo que tiene contratado o cuándo le vence.',
  schema: accountSchema,
  mutating: false,

  async execute(_args, context) {
    if (!context.clientId) return { registrado: false, suscripciones: [] };

    const overview = await createClientContainer(context.db).overviewService.execute(
      context.clientId,
      context.companyId,
    );

    return {
      registrado: true,
      codigo: overview.client.code,
      nombre: overview.client.name,
      suscripciones: overview.sales.map((sale) => ({
        servicio: sale.serviceName,
        estado: sale.status,
        vence: sale.endDate,
      })),
    };
  },
};
