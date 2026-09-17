import { describe, expect, it } from 'vitest';
import { splitText } from '@/modules/knowledge/domain/text-splitter';

describe('splitText', () => {
  it('returns nothing for empty input', () => {
    expect(splitText('')).toEqual([]);
    expect(splitText('   \n  ')).toEqual([]);
  });

  it('keeps a short text as a single chunk', () => {
    expect(splitText('Netflix cuesta 3 USD al mes.')).toEqual(['Netflix cuesta 3 USD al mes.']);
  });

  it('never exceeds the chunk size when the text can be broken up', () => {
    const paragraphs = Array.from({ length: 40 }, (_, i) => `Párrafo ${i} con algo de texto de relleno.`);
    const chunks = splitText(paragraphs.join('\n\n'), { chunkSize: 200, chunkOverlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(200);
  });

  it('prefers paragraph boundaries over cutting mid-sentence', () => {
    const text = `${'a'.repeat(80)}\n\n${'b'.repeat(80)}`;
    const chunks = splitText(text, { chunkSize: 100, chunkOverlap: 0 });

    expect(chunks).toEqual(['a'.repeat(80), 'b'.repeat(80)]);
  });

  it('repeats the tail of the previous chunk as overlap', () => {
    const text = Array.from({ length: 10 }, (_, i) => `Frase número ${i}.`).join(' ');
    const chunks = splitText(text, { chunkSize: 60, chunkOverlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    // Some text of chunk n must reappear at the start of chunk n+1.
    const tail = chunks[0].slice(-10);
    expect(chunks[1]).toContain(tail.trim().split(' ').pop()!);
  });

  it('hard-splits a text with no separator at all', () => {
    const chunks = splitText('x'.repeat(250), { chunkSize: 100, chunkOverlap: 0 });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks.join('')).toHaveLength(250);
  });

  it('caps the overlap so it can never be larger than the chunk', () => {
    const chunks = splitText('palabra '.repeat(100), { chunkSize: 50, chunkOverlap: 500 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(50);
  });

  it('keeps the original wording across chunks', () => {
    const text = 'Uno. Dos. Tres. Cuatro. Cinco. Seis. Siete. Ocho. Nueve. Diez.';
    const chunks = splitText(text, { chunkSize: 25, chunkOverlap: 0 });

    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(text);
  });
});
