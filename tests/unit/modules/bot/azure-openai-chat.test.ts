import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AzureOpenAiChatModel } from '@/modules/bot/infrastructure/azure-openai-chat.client';
import { AiUnavailableException } from '@/modules/bot/exceptions/ai-unavailable.exception';
import type { ChatRequest } from '@/modules/bot/infrastructure/ai-ports';

/** Passed explicitly so the suite never depends on the environment's credentials. */
const ENDPOINT = 'https://test.openai.azure.com/openai/v1';
const API_KEY = 'test-key';

const fetchMock = vi.fn();

const request = (overrides: Partial<ChatRequest> = {}): ChatRequest => ({
  system: 'sistema',
  contents: [{ role: 'user', parts: [{ kind: 'text', text: 'hola' }] }],
  tools: [{ name: 'listar_catalogo', description: 'Lista el catálogo.', parameters: { type: 'object' } }],
  model: 'gpt-4.1-mini',
  temperature: 0,
  ...overrides,
});

const answer = (message: object, usage?: object) =>
  new Response(JSON.stringify({ choices: [{ message }], ...(usage ? { usage } : {}) }), { status: 200 });

const failure = (status: number, body = '') => new Response(body, { status });

const sentBody = (callIndex = 0) => JSON.parse(fetchMock.mock.calls[callIndex][1].body);

const model = (deployments: string[] = []) => new AzureOpenAiChatModel(deployments, ENDPOINT, API_KEY);

describe('AzureOpenAiChatModel', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the system prompt, the deployment and the tools', async () => {
    fetchMock.mockResolvedValue(answer({ content: 'Netflix cuesta 3 USD.' }));

    const result = await model().generate(request());

    expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/chat/completions`);
    expect(fetchMock.mock.calls[0][1].headers['api-key']).toBe(API_KEY);
    expect(sentBody()).toMatchObject({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'sistema' },
        { role: 'user', content: 'hola' },
      ],
      tools: [{ type: 'function', function: { name: 'listar_catalogo' } }],
      tool_choice: 'auto',
    });
    expect(result).toMatchObject({ text: 'Netflix cuesta 3 USD.', functionCalls: [], model: 'gpt-4.1-mini' });
  });

  it('trims the trailing slash of the endpoint', async () => {
    fetchMock.mockResolvedValue(answer({ content: 'ok' }));

    await new AzureOpenAiChatModel([], `${ENDPOINT}/`, API_KEY).generate(request());

    expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/chat/completions`);
  });

  it('omits the tools when the turn declares none', async () => {
    fetchMock.mockResolvedValue(answer({ content: 'ok' }));

    await model().generate(request({ tools: [] }));

    expect(sentBody()).not.toHaveProperty('tools');
    expect(sentBody()).not.toHaveProperty('tool_choice');
  });

  it('reads the call id of every tool call and parses its arguments', async () => {
    fetchMock.mockResolvedValue(
      answer({
        content: null,
        tool_calls: [
          { id: 'call_abc', function: { name: 'listar_catalogo', arguments: '{"limite":5}' } },
          { id: 'call_def', function: { name: 'buscar_conocimiento', arguments: '{}' } },
        ],
      }),
    );

    const result = await model().generate(request());

    expect(result.text).toBeNull();
    expect(result.functionCalls).toEqual([
      { name: 'listar_catalogo', args: { limite: 5 }, callId: 'call_abc' },
      { name: 'buscar_conocimiento', args: {}, callId: 'call_def' },
    ]);
  });

  it('falls back to empty arguments when the model truncates the JSON', async () => {
    fetchMock.mockResolvedValue(
      answer({ tool_calls: [{ id: 'call_abc', function: { name: 'listar_catalogo', arguments: '{"limite":' } }] }),
    );

    const result = await model().generate(request());

    expect(result.functionCalls[0].args).toEqual({});
  });

  it('quotes the call id back when the call is replayed', async () => {
    fetchMock.mockResolvedValue(answer({ content: 'Netflix cuesta 3 USD.' }));

    await model().generate(
      request({
        contents: [
          { role: 'user', parts: [{ kind: 'text', text: 'hola' }] },
          {
            role: 'model',
            parts: [
              { kind: 'text', text: 'Déjame ver.' },
              { kind: 'functionCall', name: 'listar_catalogo', args: { limite: 5 }, callId: 'call_abc' },
            ],
          },
          {
            role: 'tool',
            parts: [
              { kind: 'functionResponse', name: 'listar_catalogo', response: { items: [] }, callId: 'call_abc' },
            ],
          },
        ],
      }),
    );

    expect(sentBody().messages.slice(1)).toEqual([
      { role: 'user', content: 'hola' },
      {
        role: 'assistant',
        content: 'Déjame ver.',
        tool_calls: [
          { id: 'call_abc', type: 'function', function: { name: 'listar_catalogo', arguments: '{"limite":5}' } },
        ],
      },
      { role: 'tool', tool_call_id: 'call_abc', content: '{"items":[]}' },
    ]);
  });

  it('pairs a call with its result by name when the history came from another provider', async () => {
    fetchMock.mockResolvedValue(answer({ content: 'ok' }));

    await model().generate(
      request({
        contents: [
          { role: 'model', parts: [{ kind: 'functionCall', name: 'listar_catalogo', args: {} }] },
          { role: 'tool', parts: [{ kind: 'functionResponse', name: 'listar_catalogo', response: {} }] },
        ],
      }),
    );

    const [assistant, tool] = sentBody().messages.slice(1);
    expect(assistant.tool_calls[0].id).toBe('call_listar_catalogo');
    expect(tool.tool_call_id).toBe('call_listar_catalogo');
  });

  it('treats a blocked answer as no text instead of failing', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ finish_reason: 'content_filter', message: { content: '' } }] }), {
        status: 200,
      }),
    );

    const result = await model().generate(request());

    expect(result).toMatchObject({ text: null, functionCalls: [], usage: null });
  });

  it('maps the token usage', async () => {
    fetchMock.mockResolvedValue(
      answer({ content: 'ok' }, { prompt_tokens: 12, completion_tokens: 1, total_tokens: 13 }),
    );

    const result = await model().generate(request());

    expect(result.usage).toEqual({ promptTokens: 12, candidatesTokens: 1, totalTokens: 13 });
  });

  it('ignores a model that was never deployed in this resource', async () => {
    fetchMock.mockResolvedValue(answer({ content: 'ok' }));

    const result = await model(['gpt-4.1-mini']).generate(request({ model: 'gemini-2.5-flash-lite' }));

    expect(sentBody().model).toBe('gpt-4.1-mini');
    expect(result.model).toBe('gpt-4.1-mini');
  });

  it('tries the configured deployment first and keeps the rest as fallback', async () => {
    fetchMock.mockResolvedValueOnce(failure(429, 'rate limit')).mockResolvedValueOnce(answer({ content: 'ok' }));

    const result = await model(['gpt-4.1-mini', 'gpt-4o-mini']).generate(request({ model: 'gpt-4o-mini' }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBody(0).model).toBe('gpt-4o-mini');
    expect(sentBody(1).model).toBe('gpt-4.1-mini');
    expect(result.model).toBe('gpt-4.1-mini');
  });

  it('moves on to the next deployment when one does not exist', async () => {
    fetchMock.mockResolvedValueOnce(failure(404, 'DeploymentNotFound')).mockResolvedValueOnce(answer({ content: 'ok' }));

    const result = await model(['no-existe', 'gpt-4.1-mini']).generate(request({ model: 'no-existe' }));

    expect(result.model).toBe('gpt-4.1-mini');
  });

  it('stops at the first deployment when the key is rejected', async () => {
    fetchMock.mockResolvedValue(failure(401, 'Access denied'));

    await expect(model(['gpt-4.1-mini', 'gpt-4o-mini']).generate(request())).rejects.toThrow(AiUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails with a domain error when every deployment is exhausted', async () => {
    fetchMock.mockResolvedValue(failure(429, 'rate limit'));

    await expect(model(['gpt-4.1-mini', 'gpt-4o-mini']).generate(request())).rejects.toThrow(AiUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // The environment is emptied first: `.env` is loaded in tests and would supply the defaults.
  it('refuses to be built without credentials', () => {
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', '');
    vi.stubEnv('AZURE_OPENAI_API_KEY', '');

    expect(() => new AzureOpenAiChatModel([], undefined, API_KEY)).toThrow(/AZURE_OPENAI_ENDPOINT/);
    expect(() => new AzureOpenAiChatModel([], ENDPOINT, undefined)).toThrow(/AZURE_OPENAI_API_KEY/);

    vi.unstubAllEnvs();
  });
});
