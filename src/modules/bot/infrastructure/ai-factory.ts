import 'server-only';
import { GeminiEmbeddings } from './gemini-embeddings.client';
import { GeminiChatModel } from './gemini-chat.client';
import { AzureOpenAiChatModel } from './azure-openai-chat.client';
import { AzureOpenAiEmbeddings } from './azure-openai-embeddings.client';
import type { ChatModel, EmbeddingModel } from './ai-ports';
import {
  DEFAULT_AZURE_EMBEDDING_MODEL,
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
} from '../models/bot-settings.model';

/**
 * The real provider adapters, built from the environment. Everything that can run in a test takes
 * the port instead, so this is only ever called from the worker, a script or a route handler.
 *
 * Chat and embeddings follow the same `BOT_AI_PROVIDER`: vectors written by two different models
 * are not comparable, so switching means re-ingesting (`pnpm knowledge:reindex`).
 */
export function embeddingModel(): EmbeddingModel {
  return isAzure() ? azureOpenAiEmbeddings() : geminiEmbeddings();
}

export function geminiEmbeddings(): EmbeddingModel {
  const model = fromEnv('BOT_EMBEDDING_MODEL', DEFAULT_EMBEDDING_MODEL);

  return new GeminiEmbeddings(model, configuredDimensions());
}

/** The name here is the deployment's, which is why it has its own default. */
export function azureOpenAiEmbeddings(): EmbeddingModel {
  const model = fromEnv('BOT_EMBEDDING_MODEL', DEFAULT_AZURE_EMBEDDING_MODEL);

  return new AzureOpenAiEmbeddings(model, configuredDimensions());
}

function configuredDimensions(): number {
  return Number(fromEnv('BOT_EMBEDDING_DIMENSIONS', String(DEFAULT_EMBEDDING_DIMENSIONS)));
}

/** The chat provider of this deployment. */
export function chatModel(): ChatModel {
  return isAzure() ? azureOpenAiChat() : geminiChat();
}

function isAzure(): boolean {
  return process.env.BOT_AI_PROVIDER === 'azure';
}

/** Fallback chain from `BOT_CHAT_MODELS`; the company's configured model is always tried first. */
export function geminiChat(): ChatModel {
  return new GeminiChatModel(configuredChatModels());
}

/** Same chain, except here each entry is the name of a deployment of the Azure resource. */
export function azureOpenAiChat(): ChatModel {
  return new AzureOpenAiChatModel(configuredChatModels());
}

function configuredChatModels(): string[] {
  return fromEnv('BOT_CHAT_MODELS', DEFAULT_CHAT_MODEL)
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

/** A variable left empty in `.env` means "not configured", not "the empty model". */
function fromEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}
