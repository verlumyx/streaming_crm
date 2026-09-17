import { z } from 'zod';
import { createSaleContainer } from '@/modules/sale/container';
import type { BotTool } from './bot-tool';

const catalogSchema = z.object({
  servicio: z.string().max(100).optional().describe('Filtra por plataforma, por ejemplo "Netflix".'),
});

const matches = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase());

/**
 * The sellable catalogue as the customer should see it: plan, duration and sale price.
 * Deliberately never exposes `cost` or `roiTargetPct` — the bot must not be able to leak margins.
 */
export const listarCatalogoTool: BotTool<typeof catalogSchema> = {
  name: 'listar_catalogo',
  description:
    'Lista los planes que la empresa vende: plataforma, nombre del plan, si es un perfil o la cuenta completa, ' +
    'duración en días y precio. Úsala siempre que hablen de precios, planes o plataformas.',
  schema: catalogSchema,
  mutating: false,

  async execute({ servicio }, context) {
    const plans = await createSaleContainer(context.db).repository.listActivePlans(context.companyId);
    const filtered = servicio ? plans.filter((plan) => matches(plan.serviceName, servicio)) : plans;

    return {
      planes: filtered.map((plan) => ({
        planCodigo: plan.code,
        servicio: plan.serviceName,
        nombre: plan.name,
        capacidad: plan.capacity === 'full_account' ? 'cuenta completa' : 'un perfil',
        duracionDias: plan.durationDays,
        precio: Number(plan.salePrice),
      })),
    };
  },
};

const availabilitySchema = z.object({
  servicio: z.string().max(100).describe('Plataforma sobre la que se consulta, por ejemplo "Netflix".'),
});

/**
 * Aggregated stock only. Returning profile ids or account emails would hand the model exactly the
 * data it must never see, so the answer is a pair of counts.
 */
export const consultarDisponibilidadTool: BotTool<typeof availabilitySchema> = {
  name: 'consultar_disponibilidad',
  description:
    'Dice cuántos perfiles y cuántas cuentas completas quedan libres de una plataforma. ' +
    'Úsala antes de prometer una entrega.',
  schema: availabilitySchema,
  mutating: false,

  async execute({ servicio }, context) {
    const sales = createSaleContainer(context.db);
    const services = await sales.repository.listServices(context.companyId);
    const match = services.find((s) => matches(s.name, servicio));
    if (!match) return { servicio, encontrado: false, perfilesDisponibles: 0, cuentasCompletasDisponibles: 0 };

    const available = await sales.repository.listAvailableProfiles(context.companyId, match.id);
    const perAccount = new Map<string, number>();
    for (const profile of available) perAccount.set(profile.accountId, (perAccount.get(profile.accountId) ?? 0) + 1);

    const serviceRef = await sales.repository.findService(match.id, context.companyId);
    const maxProfiles = serviceRef?.maxProfiles ?? 0;
    const fullAccounts = [...perAccount.values()].filter((free) => maxProfiles > 0 && free >= maxProfiles).length;

    return {
      servicio: match.name,
      encontrado: true,
      perfilesDisponibles: available.length,
      cuentasCompletasDisponibles: fullAccounts,
    };
  },
};
