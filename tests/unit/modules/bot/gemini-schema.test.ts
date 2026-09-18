import { describe, expect, it } from 'vitest';
import { sanitizeForGemini } from '@/modules/bot/infrastructure/gemini-schema';

describe('sanitizeForGemini', () => {
  it('drops the JSON Schema keywords Gemini rejects, however deep they sit', () => {
    const sanitized = sanitizeForGemini({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          items: { type: 'object', additionalProperties: false, properties: { id: { const: 'x' } } },
        },
      },
    });

    expect(sanitized).toEqual({
      type: 'object',
      properties: { items: { type: 'array', items: { type: 'object', properties: { id: {} } } } },
    });
  });

  it('keeps everything the subset does support', () => {
    const schema = {
      type: 'object',
      required: ['valor'],
      properties: {
        valor: { type: 'string', description: 'Texto', enum: ['a', 'b'] },
        limite: { type: 'integer', minimum: 1, maximum: 20 },
      },
    };

    expect(sanitizeForGemini(schema)).toEqual(schema);
  });
});
