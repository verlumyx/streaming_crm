import { describe, expect, it } from 'vitest';
import { chunkMessage } from '@/modules/bot/domain/message-chunking';

describe('chunkMessage', () => {
  it('returns nothing for an empty reply', () => {
    expect(chunkMessage('', 100)).toEqual([]);
    expect(chunkMessage('   \n ', 100)).toEqual([]);
  });

  it('keeps a short reply as one message', () => {
    expect(chunkMessage('Hola, ¿en qué te ayudo?', 4000)).toEqual(['Hola, ¿en qué te ayudo?']);
  });

  it('splits on paragraph boundaries and never exceeds the limit', () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) => `Párrafo ${i} con texto suficiente para llenar.`);
    const chunks = chunkMessage(paragraphs.join('\n\n'), 120);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(120);
  });

  it('falls back to sentence boundaries inside a long paragraph', () => {
    const text = 'Primera frase larga de ejemplo. Segunda frase larga de ejemplo. Tercera frase larga.';
    const chunks = chunkMessage(text, 40);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(40);
    expect(chunks[0]).toBe('Primera frase larga de ejemplo.');
  });

  it('hard-splits a single unbreakable run', () => {
    const chunks = chunkMessage('x'.repeat(250), 100);

    expect(chunks).toHaveLength(3);
    expect(chunks.join('')).toHaveLength(250);
  });

  it('keeps every word of the original', () => {
    const text = Array.from({ length: 30 }, (_, i) => `palabra${i}`).join(' ');
    const chunks = chunkMessage(text, 50);

    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(text);
  });
});
