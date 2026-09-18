import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AzureOpenAiEmbeddings } from '@/modules/bot/infrastructure/azure-openai-embeddings.client';
import { AiUnavailableException } from '@/modules/bot/exceptions/ai-unavailable.exception';

/** Passed explicitly so the suite never depends on the environment's credentials. */
const ENDPOINT = 'https://test.openai.azure.com/openai/v1';
const API_KEY = 'test-key';
const DIMENSIONS = 4;

const fetchMock = vi.fn();

const vector = (seed: number) => Array.from({ length: DIMENSIONS }, (_, i) => seed + i);

const answer = (items: { index?: number; embedding?: number[] }[]) =>
  new Response(JSON.stringify({ data: items }), { status: 200 });

const failure = (status: number, headers: Record<string, string> = {}) =>
  new Response('rate limit', { status, headers });

const sentBody = (callIndex = 0) => JSON.parse(fetchMock.mock.calls[callIndex][1].body);

const embeddings = () => new AzureOpenAiEmbeddings('text-embedding-3-small', DIMENSIONS, ENDPOINT, API_KEY);

describe('AzureOpenAiEmbeddings', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks for the deployment truncated to the column dimensions', async () => {
    fetchMock.mockResolvedValue(answer([{ index: 0, embedding: vector(1) }]));

    const result = await embeddings().embedQuery('¿tienen Netflix?');

    expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/embeddings`);
    expect(fetchMock.mock.calls[0][1].headers['api-key']).toBe(API_KEY);
    expect(sentBody()).toEqual({
      model: 'text-embedding-3-small',
      input: ['¿tienen Netflix?'],
      dimensions: DIMENSIONS,
    });
    expect(result).toEqual(vector(1));
  });

  it('reorders the batch by index so no vector lands on the wrong chunk', async () => {
    fetchMock.mockResolvedValue(
      answer([
        { index: 2, embedding: vector(30) },
        { index: 0, embedding: vector(10) },
        { index: 1, embedding: vector(20) },
      ]),
    );

    const result = await embeddings().embedDocuments(['a', 'b', 'c']);

    expect(result).toEqual([vector(10), vector(20), vector(30)]);
  });

  it('splits a long list into batches of 50', async () => {
    fetchMock.mockImplementation((_url: string, init: { body: string }) =>
      Promise.resolve(
        answer(JSON.parse(init.body).input.map((_: string, index: number) => ({ index, embedding: vector(index) }))),
      ),
    );

    const result = await embeddings().embedDocuments(Array.from({ length: 120 }, (_, i) => `texto ${i}`));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sentBody(0).input).toHaveLength(50);
    expect(sentBody(2).input).toHaveLength(20);
    expect(result).toHaveLength(120);
  });

  it('does not call the provider for an empty list', async () => {
    expect(await embeddings().embedDocuments([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a batch whose vectors do not match the expected shape', async () => {
    fetchMock.mockResolvedValue(answer([{ index: 0, embedding: [1, 2] }]));

    await expect(embeddings().embedQuery('hola')).rejects.toThrow(/dimensiones/);
    // A wrong shape is a configuration problem, not a hiccup: retrying would waste the quota.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honours the cooldown the provider reports on a 429', async () => {
    fetchMock
      .mockResolvedValueOnce(failure(429, { 'retry-after': '7' }))
      .mockResolvedValueOnce(answer([{ index: 0, embedding: vector(1) }]));

    const pending = embeddings().embedQuery('hola');

    await vi.advanceTimersByTimeAsync(6_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toEqual(vector(1));
  });

  it('gives up with a domain error after exhausting the attempts', async () => {
    fetchMock.mockResolvedValue(failure(500));

    const pending = embeddings().embedQuery('hola');
    const assertion = expect(pending).rejects.toBeInstanceOf(AiUnavailableException);

    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  // The environment is emptied first: `.env` is loaded in tests and would supply the defaults.
  it('refuses to be built without credentials', () => {
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', '');
    vi.stubEnv('AZURE_OPENAI_API_KEY', '');

    expect(() => new AzureOpenAiEmbeddings('m', DIMENSIONS, undefined, API_KEY)).toThrow(/AZURE_OPENAI_ENDPOINT/);
    expect(() => new AzureOpenAiEmbeddings('m', DIMENSIONS, ENDPOINT, undefined)).toThrow(/AZURE_OPENAI_API_KEY/);

    vi.unstubAllEnvs();
  });
});
