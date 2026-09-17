import { z } from 'zod';
import { createKnowledgeContainer } from '@/modules/knowledge/container';
import { RetrieveKnowledgeCommand } from '@/modules/knowledge/commands/retrieve-knowledge.command';
import { buildKnowledgeBlock } from '../domain/system-prompt';
import type { BotTool } from './bot-tool';

const schema = z.object({
  consulta: z.string().min(3).max(300).describe('Lo que el cliente quiere saber, con sus propias palabras.'),
});

/** RAG over the company's own knowledge base. Scoped by `companyId` from the runtime, never the model. */
export const buscarInformacionTool: BotTool<typeof schema> = {
  name: 'buscar_informacion',
  description:
    'Consulta la base de conocimiento de la empresa: políticas, formas de pago, preguntas frecuentes, ' +
    'cómo funciona el servicio. Úsala siempre antes de responder algo que no venga de otra herramienta.',
  schema,
  mutating: false,

  async execute({ consulta }, context) {
    const matches = await createKnowledgeContainer(context.db, context.embeddings).retrieveService.execute(
      new RetrieveKnowledgeCommand(
        context.companyId,
        consulta,
        context.settings.retrievalTopK,
        Number(context.settings.retrievalMinScore),
      ),
    );

    return {
      encontrados: matches.length,
      // Delimited and labelled as data: an injection attempt written inside a document reads as a
      // quote, not as an order.
      contexto: buildKnowledgeBlock(matches),
      fuentes: matches.map((match) => ({
        titulo: match.documentTitle,
        similitud: Number(match.similarity.toFixed(3)),
      })),
    };
  },
};
