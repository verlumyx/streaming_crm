import 'server-only';
import { GeminiEmbeddings } from './gemini-embeddings.client';
import { GeminiChatModel } from './gemini-chat.client';
import type { ChatModel, EmbeddingModel } from './ai-ports';
import { DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_DIMENSIONS, DEFAULT_EMBEDDING_MODEL } from '../models/bot-settings.model';

/**
 * The real Gemini adapters, built from the environment. Everything that can run in a test takes
 * the port instead, so this is only ever called from the worker, a script or a route handler.
 */
export function geminiEmbeddings(): EmbeddingModel {
  const model = process.env.BOT_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
  const dimensions = Number(process.env.BOT_EMBEDDING_DIMENSIONS ?? DEFAULT_EMBEDDING_DIMENSIONS);

  return new GeminiEmbeddings(model, dimensions);
}

/** Fallback chain from `BOT_CHAT_MODELS`; the company's configured model is always tried first. */
export function geminiChat(): ChatModel {
  const configured = (process.env.BOT_CHAT_MODELS ?? DEFAULT_CHAT_MODEL)
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  return new GeminiChatModel(configured);
}
