import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@google/genai', () => ({ GoogleGenAI: class {} }));

const { chatModel, embeddingModel } = await import('@/modules/bot/infrastructure/ai-factory');
const { GeminiChatModel } = await import('@/modules/bot/infrastructure/gemini-chat.client');
const { AzureOpenAiChatModel } = await import('@/modules/bot/infrastructure/azure-openai-chat.client');
const { DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_DIMENSIONS } = await import('@/modules/bot/models/bot-settings.model');

describe('chatModel', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Every case stubs the provider: `.env` is loaded in tests and may already select one.
  it('builds the Gemini adapter by default', () => {
    vi.stubEnv('BOT_AI_PROVIDER', '');
    vi.stubEnv('GOOGLE_API_KEY', 'test-key');

    expect(chatModel()).toBeInstanceOf(GeminiChatModel);
  });

  it('builds the Azure adapter when the provider says so', () => {
    vi.stubEnv('BOT_AI_PROVIDER', 'azure');
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com/openai/v1');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');

    expect(chatModel()).toBeInstanceOf(AzureOpenAiChatModel);
  });

  it('passes the configured chain to the adapter as its deployments', () => {
    vi.stubEnv('BOT_AI_PROVIDER', 'azure');
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com/openai/v1');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
    vi.stubEnv('BOT_CHAT_MODELS', 'gpt-4.1-mini, gpt-4o-mini');

    expect(chatModel()).toMatchObject({ deployments: ['gpt-4.1-mini', 'gpt-4o-mini'] });
  });
});

describe('embeddingModel', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds the Gemini adapter by default', () => {
    vi.stubEnv('BOT_AI_PROVIDER', '');
    vi.stubEnv('BOT_EMBEDDING_MODEL', '');
    vi.stubEnv('GOOGLE_API_KEY', 'test-key');

    expect(embeddingModel()).toMatchObject({ model: 'gemini-embedding-001', dimensions: 768 });
  });

  it('follows the chat provider, so vectors never mix models', () => {
    vi.stubEnv('BOT_AI_PROVIDER', 'azure');
    vi.stubEnv('BOT_EMBEDDING_MODEL', '');
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com/openai/v1');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');

    expect(embeddingModel()).toMatchObject({ model: 'text-embedding-3-small', dimensions: 768 });
  });

  it('keeps the dimensions of the column when the deployment is overridden', () => {
    vi.stubEnv('BOT_AI_PROVIDER', 'azure');
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com/openai/v1');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
    vi.stubEnv('BOT_EMBEDDING_MODEL', 'embeddings-prod');

    expect(embeddingModel()).toMatchObject({ model: 'embeddings-prod', dimensions: 768 });
  });
});

describe('an empty variable', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to the default instead of asking for a nameless model', () => {
    vi.stubEnv('BOT_AI_PROVIDER', '');
    vi.stubEnv('GOOGLE_API_KEY', 'test-key');
    vi.stubEnv('BOT_CHAT_MODELS', '');
    vi.stubEnv('BOT_EMBEDDING_DIMENSIONS', '');

    expect(chatModel()).toMatchObject({ fallbackModels: [DEFAULT_CHAT_MODEL] });
    expect(embeddingModel()).toMatchObject({ dimensions: DEFAULT_EMBEDDING_DIMENSIONS });
  });
});
