import type { ChatModel, ChatTurn, TokenUsage } from '../infrastructure/ai-ports';
import { toDeclaration } from '../tools/bot-tool';
import type { BotTool, ToolContext } from '../tools/bot-tool';
import type { BotToolRunner, ToolRun } from './bot-tool-runner.service';

export type AgentOutcome = {
  text: string | null;
  toolRuns: ToolRun[];
  usage: TokenUsage | null;
  model: string;
  /** True when the loop was cut short: the model kept calling tools without ever answering. */
  exhausted: boolean;
};

/**
 * The reason-and-act loop: ask the model, run whatever tools it asked for, feed the results back,
 * repeat until it produces text. Capped by `maxIterations` so a model stuck in a tool loop cannot
 * burn the quota or hang the worker.
 */
export class BotAgentRunner {
  constructor(
    private readonly chat: ChatModel,
    private readonly toolRunner: BotToolRunner,
  ) {}

  async run(input: {
    system: string;
    history: ChatTurn[];
    tools: BotTool[];
    model: string;
    temperature: number;
    maxIterations: number;
    context: ToolContext;
  }): Promise<AgentOutcome> {
    const declarations = input.tools.map(toDeclaration);
    const contents = [...input.history];
    const toolRuns: ToolRun[] = [];
    let usage: TokenUsage | null = null;
    let model = input.model;

    for (let iteration = 0; iteration < input.maxIterations; iteration++) {
      const response = await this.chat.generate({
        system: input.system,
        contents,
        tools: declarations,
        // Whoever answered first keeps the conversation: its thought signatures are only valid for it.
        model,
        temperature: input.temperature,
      });

      usage = accumulate(usage, response.usage);
      model = response.model;

      if (response.functionCalls.length === 0) {
        return { text: response.text, toolRuns, usage, model, exhausted: false };
      }

      contents.push({
        role: 'model',
        parts: response.functionCalls.map((call) => ({
          kind: 'functionCall' as const,
          name: call.name,
          args: call.args,
          // The provider demands its own signature back with the replayed call.
          thoughtSignature: call.thoughtSignature,
        })),
      });

      const responses: ChatTurn['parts'] = [];
      for (const call of response.functionCalls) {
        const run = await this.toolRunner.run(call.name, call.args, input.context);
        toolRuns.push(run);
        responses.push({ kind: 'functionResponse', name: run.name, response: run.result });
      }
      contents.push({ role: 'tool', parts: responses });
    }

    return { text: null, toolRuns, usage, model, exhausted: true };
  }
}

function accumulate(total: TokenUsage | null, next: TokenUsage | null): TokenUsage | null {
  if (!next) return total;
  if (!total) return next;

  return {
    promptTokens: total.promptTokens + next.promptTokens,
    candidatesTokens: total.candidatesTokens + next.candidatesTokens,
    totalTokens: total.totalTokens + next.totalTokens,
  };
}
