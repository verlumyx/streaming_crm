/**
 * Splits a reply into messages a channel will accept, preferring paragraph then sentence breaks
 * so the conversation still reads naturally. A single unbreakable run is hard-split as a last resort.
 */
export function chunkMessage(text: string, maxLength: number): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized === '') return [];
  if (normalized.length <= maxLength) return [normalized];

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of normalized.split('\n\n')) {
    for (const piece of fit(paragraph, maxLength)) {
      const candidate = current === '' ? piece : `${current}\n\n${piece}`;
      if (candidate.length <= maxLength) {
        current = candidate;
        continue;
      }
      if (current !== '') chunks.push(current);
      current = piece;
    }
  }

  if (current !== '') chunks.push(current);

  return chunks;
}

/**
 * Breaks a paragraph that is itself too long: by sentence, then by word, and only as a last
 * resort mid-word — a chat reply that cuts a word in half reads like a bug to the customer.
 */
function fit(paragraph: string, maxLength: number): string[] {
  if (paragraph.length <= maxLength) return [paragraph];

  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) return packed(sentences, ' ', maxLength).flatMap((s) => fit(s, maxLength));

  const words = paragraph.split(' ');
  if (words.length > 1) return packed(words, ' ', maxLength).flatMap((w) => fit(w, maxLength));

  const pieces: string[] = [];
  for (let i = 0; i < paragraph.length; i += maxLength) pieces.push(paragraph.slice(i, i + maxLength));
  return pieces;
}

/** Greedily joins parts with `glue` while they fit. Parts longer than the limit come out alone. */
function packed(parts: string[], glue: string, maxLength: number): string[] {
  const out: string[] = [];
  let current = '';

  for (const part of parts) {
    const candidate = current === '' ? part : current + glue + part;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }
    if (current !== '') out.push(current);
    current = part;
  }

  if (current !== '') out.push(current);
  return out;
}
