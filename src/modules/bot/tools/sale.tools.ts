import { z } from 'zod';
import { createSaleContainer } from '@/modules/sale/container';
import { CreateSaleCommand } from '@/modules/sale/commands/create-sale.command';
import { SearchSaleCommand } from '@/modules/sale/commands/search-sale.command';
import { DomainError } from '@/modules/shared/exceptions/domain-error';
import { uuidv7 } from '@/modules/shared/uuid';
import { toBolivares } from '../domain/exchange-rate';
import type { SaleAvailableProfile } from '@/modules/sale/repositories/sale.repository';
import type { BotTool } from './bot-tool';

const createSchema = z.object({
  planCodigo: z
    .string()
    .regex(/^PLA\d{6}$/, 'Usa el código exacto del plan, como PLA000003.')
    .describe('Código del plan, tal como lo devolvió listar_catalogo.'),
});

/**
 * Registers a sale in `pending`: no profile is occupied and no income is recorded until a person
 * verifies the payment and approves it. That is the whole safety model of the automated funnel.
 *
 * The sale is signed by the company's bot user (`app_sales.agent_id` is NOT NULL), so it shows up
 * in the listing and the reports attributed to "Asistente IA" like any other seller's.
 */
export const crearVentaTool: BotTool<typeof createSchema> = {
  name: 'crear_venta',
  description:
    'Registra la venta del plan indicado para la persona con la que hablas. La venta queda POR APROBAR ' +
    'hasta que se verifique el pago. Úsala solo después de que confirme el plan y el precio.',
  schema: createSchema,
  mutating: true,

  async execute({ planCodigo }, context) {
    if (!context.clientId) {
      return { error: 'sin_cliente', mensaje: 'Primero registra al cliente con registrar_cliente.' };
    }

    const sales = createSaleContainer(context.db);
    const plans = await sales.repository.listActivePlans(context.companyId);
    const plan = plans.find((p) => p.code === planCodigo);
    if (!plan) return { error: 'plan_no_encontrado', mensaje: 'Ese plan no existe o ya no está activo.' };

    const available = await sales.repository.listAvailableProfiles(context.companyId, plan.serviceId);
    const profileIds = pickProfiles(available, plan.capacity, plan.maxProfiles);
    if (!profileIds) {
      return {
        error: 'sin_disponibilidad',
        mensaje: `No quedan perfiles libres de ${plan.serviceName} para ese plan.`,
      };
    }

    try {
      const [sale] = await sales.createService.execute(
        new CreateSaleCommand(
          uuidv7(),
          context.companyId,
          context.botUserId,
          context.clientId,
          plan.id,
          context.today,
          profileIds,
          'Venta registrada por el asistente.',
        ),
      );

      const precioUsd = Number(sale.price);
      const precioBs = toBolivares(precioUsd, context.exchangeRate);

      return {
        codigoVenta: sale.code,
        servicio: plan.serviceName,
        plan: plan.name,
        precioUsd,
        ...(precioBs === null ? {} : { precioBs }),
        inicio: sale.startDate,
        fin: sale.endDate,
        estado: 'por aprobar',
        instruccionesPago: context.settings.paymentInstructions,
      };
    } catch (error) {
      // Business failures come back as data so the model can explain them; bugs still blow up.
      if (error instanceof DomainError) return { error: 'no_registrada', mensaje: error.message };
      throw error;
    }
  },
};

/**
 * Exactly the profiles the plan needs: one for a `profile` plan, every profile of a single account
 * for `full_account`. Anything already committed by a recent pending sale is filtered out upstream
 * by `listAvailableProfiles`, so the bot cannot oversell.
 */
function pickProfiles(
  available: SaleAvailableProfile[],
  capacity: 'profile' | 'full_account',
  maxProfiles: number,
): string[] | null {
  if (capacity === 'profile') return available.length > 0 ? [available[0].id] : null;

  const byAccount = new Map<string, SaleAvailableProfile[]>();
  for (const profile of available) {
    byAccount.set(profile.accountId, [...(byAccount.get(profile.accountId) ?? []), profile]);
  }

  for (const profiles of byAccount.values()) {
    if (profiles.length >= maxProfiles) return profiles.slice(0, maxProfiles).map((p) => p.id);
  }

  return null;
}

const listSchema = z.object({});

/** Only this contact's own sales: `clientId` comes from the runtime, never from the model. */
export const consultarMisVentasTool: BotTool<typeof listSchema> = {
  name: 'consultar_mis_ventas',
  description: 'Lista las ventas de la persona con la que hablas, con su estado y su fecha de vencimiento.',
  schema: listSchema,
  mutating: false,

  async execute(_args, context) {
    if (!context.clientId) return { registrado: false, ventas: [] };

    const { data } = await createSaleContainer(context.db).searchService.execute(
      new SearchSaleCommand({ companyId: context.companyId, filters: { clientId: context.clientId }, limit: 20 }),
    );

    return {
      registrado: true,
      ventas: data.map((sale) => ({
        codigo: sale.code,
        servicio: sale.service?.name ?? null,
        estado: sale.status,
        vence: sale.endDate,
        precioUsd: Number(sale.price),
      })),
    };
  },
};
