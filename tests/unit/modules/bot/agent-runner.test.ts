import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BotAgentRunner } from '@/modules/bot/services/bot-agent-runner.service';
import { BotToolRunner } from '@/modules/bot/services/bot-tool-runner.service';
import type { BotTool, ToolContext } from '@/modules/bot/tools/bot-tool';
import { ValidationError } from '@/modules/shared/exceptions/domain-error';
import { FakeChatModel } from './fake-ai';

const context = {} as ToolContext;
/** Mutating tools are wrapped by the caller's transaction runner; here it is a pass-through. */
const passThrough = <T,>(work: (tx: never) => Promise<T>) => work(undefined as never);

const echoTool: BotTool<z.ZodObject<{ valor: z.ZodString }>> = {
  name: 'eco',
  description: 'Devuelve lo que recibe.',
  schema: z.object({ valor: z.string().min(1) }),
  mutating: false,
  async execute({ valor }) {
    return { eco: valor };
  },
};

const explodingTool: BotTool<z.ZodObject<Record<string, never>>> = {
  name: 'explota',
  description: 'Falla siempre.',
  schema: z.object({}),
  mutating: true,
  async execute() {
    throw new ValidationError('valor', 'No se pudo completar.');
  },
};

const bugTool: BotTool<z.ZodObject<Record<string, never>>> = {
  name: 'bug',
  description: 'Lanza un error inesperado.',
  schema: z.object({}),
  mutating: false,
  async execute() {
    throw new TypeError('undefined is not a function');
  },
};

const runner = (chat: FakeChatModel, tools: BotTool[]) =>
  new BotAgentRunner(chat, new BotToolRunner(tools, passThrough));

const run = (chat: FakeChatModel, tools: BotTool[], maxIterations = 5) =>
  runner(chat, tools).run({
    system: 'sistema',
    history: [{ role: 'user', parts: [{ kind: 'text', text: 'hola' }] }],
    tools,
    model: 'fake',
    temperature: 0,
    maxIterations,
    context,
  });

describe('BotAgentRunner', () => {
  it('returns the text when the model answers straight away', async () => {
    const chat = new FakeChatModel([{ text: 'Hola, ¿en qué te ayudo?' }]);

    const outcome = await run(chat, [echoTool]);

    expect(outcome).toMatchObject({ text: 'Hola, ¿en qué te ayudo?', exhausted: false });
    expect(outcome.toolRuns).toEqual([]);
  });

  it('runs the tool the model asked for and feeds the result back', async () => {
    const chat = new FakeChatModel([
      { functionCalls: [{ name: 'eco', args: { valor: 'Netflix' } }] },
      { text: 'Netflix cuesta 3 USD.' },
    ]);

    const outcome = await run(chat, [echoTool]);

    expect(outcome.text).toBe('Netflix cuesta 3 USD.');
    expect(outcome.toolRuns).toEqual([{ name: 'eco', args: { valor: 'Netflix' }, result: { eco: 'Netflix' } }]);
    // The second request carries the call and its response.
    const secondTurn = chat.requests[1].contents;
    expect(secondTurn.at(-2)?.parts[0]).toMatchObject({ kind: 'functionCall', name: 'eco' });
    expect(secondTurn.at(-1)?.parts[0]).toMatchObject({ kind: 'functionResponse', name: 'eco' });
  });

  it('replays the call with the thought signature the model attached to it', async () => {
    const chat = new FakeChatModel([
      { functionCalls: [{ name: 'eco', args: { valor: 'Netflix' }, thoughtSignature: 'firma-abc' }] },
      { text: 'Netflix cuesta 3 USD.' },
    ]);

    await run(chat, [echoTool]);

    // Gemini rejects the whole request when a replayed call comes back unsigned.
    expect(chat.requests[1].contents.at(-2)?.parts[0]).toMatchObject({
      kind: 'functionCall',
      name: 'eco',
      thoughtSignature: 'firma-abc',
    });
  });

  it('pairs every tool result with the id of the call it answers', async () => {
    const chat = new FakeChatModel([
      {
        functionCalls: [
          { name: 'eco', args: { valor: 'a' }, callId: 'call_1' },
          { name: 'eco', args: { valor: 'b' }, callId: 'call_2' },
        ],
      },
      { text: 'listo' },
    ]);

    await run(chat, [echoTool]);

    // OpenAI pairs a result with its call by id, never by name: the same tool runs twice here.
    const [calls, results] = chat.requests[1].contents.slice(-2);
    expect(calls.parts).toMatchObject([{ callId: 'call_1' }, { callId: 'call_2' }]);
    expect(results.parts).toMatchObject([
      { kind: 'functionResponse', name: 'eco', callId: 'call_1', response: { eco: 'a' } },
      { kind: 'functionResponse', name: 'eco', callId: 'call_2', response: { eco: 'b' } },
    ]);
  });

  it('keeps talking to the model that actually answered', async () => {
    const chat = new FakeChatModel([
      { functionCalls: [{ name: 'eco', args: { valor: 'x' } }], model: 'modelo-de-respaldo' },
      { text: 'listo' },
    ]);

    const outcome = await run(chat, [echoTool]);

    // The signatures of the fallback model are only valid for it, so the loop must not go back.
    expect(chat.requests.map((request) => request.model)).toEqual(['fake', 'modelo-de-respaldo']);
    expect(outcome.model).toBe('modelo-de-respaldo');
  });

  it('stops after `maxIterations` when the model never answers', async () => {
    const chat = new FakeChatModel(
      Array.from({ length: 10 }, () => ({ functionCalls: [{ name: 'eco', args: { valor: 'x' } }] })),
    );

    const outcome = await run(chat, [echoTool], 3);

    expect(outcome).toMatchObject({ text: null, exhausted: true });
    expect(outcome.toolRuns).toHaveLength(3);
    expect(chat.requests).toHaveLength(3);
  });

  it('hands an unknown tool back as data instead of failing the turn', async () => {
    const chat = new FakeChatModel([
      { functionCalls: [{ name: 'inventada', args: {} }] },
      { text: 'Perdona, no puedo con eso.' },
    ]);

    const outcome = await run(chat, [echoTool]);

    expect(outcome.toolRuns[0].result).toEqual({ error: 'herramienta_no_disponible' });
    expect(outcome.text).toBe('Perdona, no puedo con eso.');
  });

  it('rejects bad arguments without calling the tool', async () => {
    const chat = new FakeChatModel([
      { functionCalls: [{ name: 'eco', args: { valor: '' } }] },
      { text: 'Necesito más detalle.' },
    ]);

    const outcome = await run(chat, [echoTool]);

    expect(outcome.toolRuns[0].result).toMatchObject({ error: 'argumentos_invalidos' });
  });

  it('turns a business failure into data the model can explain', async () => {
    const chat = new FakeChatModel([
      { functionCalls: [{ name: 'explota', args: {} }] },
      { text: 'No se pudo, lo siento.' },
    ]);

    const outcome = await run(chat, [explodingTool]);

    expect(outcome.toolRuns[0].result).toEqual({ error: 'No se pudo completar.' });
  });

  it('lets a genuine bug propagate so the event is retried', async () => {
    const chat = new FakeChatModel([{ functionCalls: [{ name: 'bug', args: {} }] }]);

    await expect(run(chat, [bugTool])).rejects.toBeInstanceOf(TypeError);
  });

  it('accumulates token usage across iterations', async () => {
    const chat = new FakeChatModel([
      { functionCalls: [{ name: 'eco', args: { valor: 'x' } }] },
      { text: 'listo' },
    ]);

    const outcome = await run(chat, [echoTool]);

    expect(outcome.usage).toEqual({ promptTokens: 20, candidatesTokens: 10, totalTokens: 30 });
  });
});
