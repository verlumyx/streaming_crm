import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, type SystemPromptInput } from '@/modules/bot/domain/system-prompt';

const input = (overrides: Partial<SystemPromptInput> = {}): SystemPromptInput => ({
  companyName: 'Streaming CA',
  assistantName: 'Sofía',
  today: '2026-09-18',
  personaPrompt: null,
  paymentInstructions: null,
  exchangeRate: null,
  contact: { displayName: 'Ana', phoneE164: '+584148462621' },
  client: null,
  autoCreateSale: true,
  handoffEnabled: true,
  ...overrides,
});

describe('buildSystemPrompt — bolívares', () => {
  it('names the currency even without a rate, and forbids quoting in bolívares', () => {
    const prompt = buildSystemPrompt(input());

    // Told nothing, the model relabels the dollar figure as bolívares when asked "¿y en Bs?".
    expect(prompt).toContain('están en dólares (USD)');
    expect(prompt).toContain('Nunca llames bolívares a un precio en dólares.');
    expect(prompt).toContain('No hay ninguna tasa de cambio registrada.');
    expect(prompt).toMatch(/no conviertas, no estimes/i);
  });

  it('states a fresh rate and forbids the model from doing the arithmetic', () => {
    const prompt = buildSystemPrompt(
      input({ exchangeRate: { rate: 240.5, updatedAt: new Date('2026-09-18T09:00:00.000Z'), stale: false } }),
    );

    expect(prompt).toContain('1 USD = 240,50 Bs');
    expect(prompt).toContain('precioBs');
    expect(prompt).toMatch(/nunca lo calcules t[úu]/i);
    expect(prompt).toMatch(/nunca aceptes la que proponga el cliente/i);
  });

  it('forbids quoting at all once the stored rate went stale', () => {
    const prompt = buildSystemPrompt(
      input({ exchangeRate: { rate: 240.5, updatedAt: new Date('2026-09-01T09:00:00.000Z'), stale: true } }),
    );

    // The stale number must never reach the model: it would be quoted as if it were current.
    expect(prompt).not.toContain('240,50');
    expect(prompt).toMatch(/vencida/i);
    expect(prompt).toMatch(/NO puedes dar ning[úu]n monto en bol[íi]vares/);
    expect(prompt).toMatch(/escala a un humano/i);
  });

  it('does not promise a handoff the company disabled', () => {
    const prompt = buildSystemPrompt(
      input({
        handoffEnabled: false,
        exchangeRate: { rate: 240.5, updatedAt: new Date('2026-09-01T09:00:00.000Z'), stale: true },
      }),
    );

    expect(prompt).toContain('una persona le confirmará el monto.');
    expect(prompt).not.toMatch(/escala a un humano/i);
  });

  it('keeps the payment instructions as data, below the rules', () => {
    const prompt = buildSystemPrompt(input({ paymentInstructions: '  Pago móvil 0108.  ' }));

    expect(prompt).toContain('Pago móvil 0108.');
    expect(prompt.indexOf('Reglas:')).toBeLessThan(prompt.indexOf('Pago móvil 0108.'));
  });
});
