/** A retrieval request: never built from user input directly, always from the bot's tool context. */
export class RetrieveKnowledgeCommand {
  constructor(
    readonly companyId: string,
    readonly query: string,
    readonly topK: number,
    /** Cosine similarity below this is treated as irrelevant and dropped before the prompt. */
    readonly minScore: number,
  ) {}
}
