import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatRequest } from '@/modules/bot/infrastructure/ai-ports';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly models = { generateContent };
  },
}));

const { GeminiChatModel } = await import('@/modules/bot/infrastructure/gemini-chat.client');

/** Passed explicitly so the suite never depends on the environment's key. */
const API_KEY = 'test-key';

const request = (overrides: Partial<ChatRequest> = {}): ChatRequest => ({
  system: 'sistema',
  contents: [{ role: 'user', parts: [{ kind: 'text', text: 'hola' }] }],
  tools: [{ name: 'listar_catalogo', description: 'Lista el catálogo.', parameters: { type: 'object' } }],
  model: 'gemini-flash-latest',
  temperature: 0,
  ...overrides,
});

const answer = (parts: unknown[]) => ({ candidates: [{ content: { parts } }] });

const sentParts = (callIndex = 0) => generateContent.mock.calls[callIndex][0].contents.at(-1).parts;

describe('GeminiChatModel', () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it('keeps the thought signature of every function call', async () => {
    generateContent.mockResolvedValue(
      answer([
        { functionCall: { name: 'listar_catalogo', args: { limite: 5 } }, thoughtSignature: 'firma-1' },
        { functionCall: { name: 'buscar_conocimiento', args: {} }, thoughtSignature: 'firma-2' },
      ]),
    );

    const result = await new GeminiChatModel([], API_KEY).generate(request());

    expect(result.functionCalls).toEqual([
      { name: 'listar_catalogo', args: { limite: 5 }, thoughtSignature: 'firma-1' },
      { name: 'buscar_conocimiento', args: {}, thoughtSignature: 'firma-2' },
    ]);
  });

  it('reuses the signature of the turn when the call itself came unsigned', async () => {
    generateContent.mockResolvedValue(
      answer([
        { text: 'Déjame ver el catálogo.', thoughtSignature: 'firma-del-turno' },
        { functionCall: { name: 'listar_catalogo', args: {} } },
      ]),
    );

    const result = await new GeminiChatModel([], API_KEY).generate(request());

    expect(result.functionCalls[0].thoughtSignature).toBe('firma-del-turno');
  });

  it('sends the signature back when the call is replayed', async () => {
    generateContent.mockResolvedValue(answer([{ text: 'Netflix cuesta 3 USD.' }]));

    await new GeminiChatModel([], API_KEY).generate(
      request({
        contents: [
          { role: 'user', parts: [{ kind: 'text', text: 'hola' }] },
          {
            role: 'model',
            parts: [{ kind: 'functionCall', name: 'listar_catalogo', args: {}, thoughtSignature: 'firma-1' }],
          },
          { role: 'tool', parts: [{ kind: 'functionResponse', name: 'listar_catalogo', response: { items: [] } }] },
        ],
      }),
    );

    const modelTurn = generateContent.mock.calls[0][0].contents[1];
    expect(modelTurn.parts[0]).toEqual({
      functionCall: { name: 'listar_catalogo', args: {} },
      thoughtSignature: 'firma-1',
    });
  });

  it('strips the signatures when a fallback model takes over', async () => {
    generateContent
      .mockRejectedValueOnce(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}'))
      .mockResolvedValueOnce(answer([{ text: 'listo' }]));

    const result = await new GeminiChatModel(['gemini-flash-latest', 'gemini-flash-lite-latest'], API_KEY).generate(
      request({
        contents: [
          {
            role: 'model',
            parts: [{ kind: 'functionCall', name: 'listar_catalogo', args: {}, thoughtSignature: 'firma-1' }],
          },
        ],
      }),
    );

    expect(result.model).toBe('gemini-flash-lite-latest');
    // A signature issued by another model would be rejected as INVALID_ARGUMENT.
    expect(sentParts(0)[0]).toHaveProperty('thoughtSignature', 'firma-1');
    expect(sentParts(1)[0]).not.toHaveProperty('thoughtSignature');
  });

  it('leaves the thought summary out of the reply text', async () => {
    generateContent.mockResolvedValue(
      answer([
        { text: 'El cliente pregunta por el precio.', thought: true },
        { text: 'Netflix cuesta 3 USD.' },
      ]),
    );

    const result = await new GeminiChatModel([], API_KEY).generate(request());

    expect(result.text).toBe('Netflix cuesta 3 USD.');
  });

  it('fails with a domain exception when no model answers', async () => {
    generateContent.mockRejectedValue(new Error('boom'));

    await expect(new GeminiChatModel([], API_KEY).generate(request())).rejects.toThrow(/El modelo no respondió/);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});
