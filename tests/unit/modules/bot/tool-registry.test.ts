import { describe, expect, it } from 'vitest';
import { buildToolRegistry } from '@/modules/bot/tools/tool-registry';
import { toDeclaration } from '@/modules/bot/tools/bot-tool';
import { sanitizeForGemini } from '@/modules/bot/infrastructure/gemini-schema';
import type { BotSettingsRow } from '@/modules/bot/models/bot-settings.model';

const settings = (overrides: Partial<BotSettingsRow> = {}): BotSettingsRow =>
  ({
    autoCreateClient: true,
    autoCreateSale: true,
    handoffEnabled: true,
    ...overrides,
  }) as BotSettingsRow;

describe('tool registry', () => {
  it('exposes the read-only tools always', () => {
    const names = buildToolRegistry(settings()).map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'buscar_informacion',
        'listar_catalogo',
        'consultar_disponibilidad',
        'consultar_mi_cuenta',
        'consultar_mis_ventas',
      ]),
    );
  });

  it('hides each writing tool when the company turned it off', () => {
    const names = (s: BotSettingsRow) => buildToolRegistry(s).map((tool) => tool.name);

    expect(names(settings({ autoCreateSale: false }))).not.toContain('crear_venta');
    expect(names(settings({ autoCreateClient: false }))).not.toContain('registrar_cliente');
    expect(names(settings({ handoffEnabled: false }))).not.toContain('escalar_a_humano');
    expect(names(settings())).toEqual(expect.arrayContaining(['crear_venta', 'registrar_cliente', 'escalar_a_humano']));
  });

  it('never exposes streaming accounts, credentials or raw SQL', () => {
    const names = buildToolRegistry(settings()).map((tool) => tool.name);

    for (const name of names) {
      expect(name).not.toMatch(/cuenta_|account|password|contrasena|credencial|sql|query|consulta_libre/i);
    }
    // `consultar_mi_cuenta` is about the customer's own subscriptions, not a streaming account.
    expect(names).not.toContain('consultar_cuentas');
  });

  it('no tool lets the model choose the company, the client or a profile', () => {
    for (const tool of buildToolRegistry(settings())) {
      const properties = Object.keys(
        (toDeclaration(tool).parameters as { properties?: Record<string, unknown> }).properties ?? {},
      );
      for (const property of properties) {
        expect(property).not.toMatch(/company|empresa|clientId|clienteId|profileId|perfilId|saleId|ventaId|agentId/i);
      }
    }
  });

  it('every schema survives the narrowing to the OpenAPI subset Gemini accepts', () => {
    for (const tool of buildToolRegistry(settings())) {
      const parameters = sanitizeForGemini(toDeclaration(tool).parameters);
      const serialized = JSON.stringify(parameters);

      expect(tool.description.length).toBeGreaterThan(20);
      expect(parameters).toMatchObject({ type: 'object' });
      for (const keyword of ['$schema', '$ref', '$defs', 'additionalProperties', 'exclusiveMinimum']) {
        expect(serialized).not.toContain(keyword);
      }
    }
  });

  it('marks exactly the writing tools as mutating', () => {
    const mutating = buildToolRegistry(settings())
      .filter((tool) => tool.mutating)
      .map((tool) => tool.name)
      .sort();

    expect(mutating).toEqual(['crear_venta', 'escalar_a_humano', 'registrar_cliente']);
  });
});
