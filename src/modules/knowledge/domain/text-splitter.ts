export type SplitOptions = {
  /** Target size in characters. A chunk only exceeds it when a single atom is bigger. */
  chunkSize?: number;
  /** Characters repeated from the end of the previous chunk, so a fact split in two stays findable. */
  chunkOverlap?: number;
};

export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 150;

/** From coarsest to finest. The last one splits mid-word and is only reached by a pathological input. */
const SEPARATORS = ['\n\n', '\n', '. ', ' ', ''] as const;

/**
 * Recursive character splitter: keeps paragraphs whole when it can, falls back to lines, then
 * sentences, then words. Same idea as LangChain's `RecursiveCharacterTextSplitter`, reimplemented
 * here so the project does not take a LangChain dependency for 70 lines of pure logic.
 */
export function splitText(text: string, options: SplitOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = Math.min(options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP, Math.max(chunkSize - 1, 0));

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized === '') return [];
  if (normalized.length <= chunkSize) return [normalized];

  return merge(atomize(normalized, chunkSize, 0), chunkSize, chunkOverlap);
}

/** Breaks the text down until every piece fits, descending through the separators. */
function atomize(text: string, chunkSize: number, separatorIndex: number): string[] {
  if (text.length <= chunkSize) return [text];

  const separator = SEPARATORS[separatorIndex];
  if (separator === undefined) return hardSplit(text, chunkSize);
  if (separator === '') return hardSplit(text, chunkSize);

  const parts = text.split(separator).filter((part) => part !== '');
  // The separator is absent (a single part): go finer without looping forever.
  if (parts.length <= 1) return atomize(text, chunkSize, separatorIndex + 1);

  return parts.flatMap((part, index) => {
    // Keep the separator so re-joined chunks read like the original.
    const piece = index < parts.length - 1 ? part + separator : part;
    return atomize(piece, chunkSize, separatorIndex + 1);
  });
}

function hardSplit(text: string, chunkSize: number): string[] {
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) pieces.push(text.slice(i, i + chunkSize));
  return pieces;
}

/** Packs atoms into chunks of at most `chunkSize`, repeating the tail of the previous one. */
function merge(atoms: string[], chunkSize: number, chunkOverlap: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const atom of atoms) {
    if (current !== '' && current.length + atom.length > chunkSize) {
      chunks.push(current.trim());
      const overlap = chunkOverlap > 0 ? current.slice(-chunkOverlap) : '';
      // Drop the overlap when carrying it would push the chunk past the limit: staying under
      // `chunkSize` matters more than the redundancy, and atoms already fit by construction.
      current = overlap.length + atom.length <= chunkSize ? overlap : '';
    }
    current += atom;
  }

  if (current.trim() !== '') chunks.push(current.trim());

  return chunks.filter((chunk) => chunk !== '');
}
