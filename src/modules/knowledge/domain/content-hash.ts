import { createHash } from 'node:crypto';

/** Identity of a document's text: re-ingesting unchanged content must not cost an embedding call. */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Rough token count for reporting and for keeping the prompt within budget. Spanish averages
 * close to 4 characters per token with Gemini's tokenizer; exactness is not worth an API call.
 */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
