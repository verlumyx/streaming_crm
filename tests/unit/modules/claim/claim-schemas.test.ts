import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { uuidv7 } from '@/modules/shared/uuid';
import { createClaimSchema } from '@/modules/claim/validation/create-claim.schema';
import { updateClaimSchema } from '@/modules/claim/validation/update-claim.schema';
import { updateStatusClaimSchema } from '@/modules/claim/validation/update-status-claim.schema';
import { searchClaimSchema } from '@/modules/claim/validation/search-claim.schema';
import { SearchClaimCommand } from '@/modules/claim/commands/search-claim.command';

const errors = (result: z.ZodSafeParseResult<unknown>): Record<string, string[] | undefined> =>
  result.success ? {} : z.flattenError(result.error).fieldErrors;

const validCreate = () => ({
  id: uuidv7(),
  clientId: uuidv7(),
  subject: 'No carga Netflix',
  description: 'El perfil pide contraseña.',
  channel: 'whatsapp',
});

describe('createClaimSchema', () => {
  it('accepts a complete form', () => {
    const result = createClaimSchema.safeParse(validCreate());

    expect(result.success).toBe(true);
  });

  it('defaults the channel to other when the form does not send it', () => {
    const values: Record<string, string> = validCreate();
    delete values.channel;

    const result = createClaimSchema.safeParse(values);

    expect(result.success && result.data.channel).toBe('other');
  });

  it('requires client, subject and description', () => {
    const result = createClaimSchema.safeParse({ id: uuidv7(), clientId: '', subject: '  ', description: '' });

    expect(errors(result)).toMatchObject({
      clientId: ['El cliente es obligatorio.'],
      subject: ['El asunto es obligatorio.'],
      description: ['La descripción es obligatorio.'],
    });
  });

  it('rejects an unknown channel and a subject over 150 characters', () => {
    const result = createClaimSchema.safeParse({ ...validCreate(), channel: 'paloma', subject: 'x'.repeat(151) });

    expect(errors(result).channel).toEqual(['El canal no es válido.']);
    expect(errors(result).subject).toEqual(['El asunto no puede superar 150 caracteres.']);
  });

  it('trims the text fields', () => {
    const result = createClaimSchema.safeParse({ ...validCreate(), subject: '  Asunto  ' });

    expect(result.success && result.data.subject).toBe('Asunto');
  });
});

describe('updateClaimSchema', () => {
  it('never takes the id, the status nor the resolution notes', () => {
    const result = updateClaimSchema.safeParse({
      ...validCreate(),
      status: 'closed',
      resolutionNotes: 'nope',
    });

    expect(result.success && result.data).not.toHaveProperty('id');
    expect(result.success && result.data).not.toHaveProperty('status');
    expect(result.success && result.data).not.toHaveProperty('resolutionNotes');
  });
});

describe('updateStatusClaimSchema', () => {
  it('accepts every status of the flow', () => {
    for (const status of ['open', 'in_progress', 'resolved', 'closed']) {
      expect(updateStatusClaimSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects an unknown status', () => {
    expect(errors(updateStatusClaimSchema.safeParse({ status: 'archivado' })).status).toEqual([
      'El estado no es válido.',
    ]);
  });

  it('leaves the notes undefined when the form omits them and null when they arrive empty', () => {
    const omitted = updateStatusClaimSchema.safeParse({ status: 'resolved' });
    const empty = updateStatusClaimSchema.safeParse({ status: 'resolved', resolutionNotes: '   ' });

    expect(omitted.success && omitted.data.resolutionNotes).toBeUndefined();
    expect(empty.success && empty.data.resolutionNotes).toBeNull();
  });

  it('rejects notes over 2000 characters', () => {
    const result = updateStatusClaimSchema.safeParse({ status: 'resolved', resolutionNotes: 'x'.repeat(2001) });

    expect(errors(result).resolutionNotes).toEqual(['Las notas de resolución no pueden superar 2000 caracteres.']);
  });
});

describe('searchClaimSchema', () => {
  it('ignores unknown values instead of throwing', () => {
    const input = searchClaimSchema.parse({ status: 'archivado', channel: 'paloma', clientId: 'x', limit: 'abc' });

    expect(input).toMatchObject({ status: undefined, channel: undefined, clientId: undefined, limit: 10, offset: 0 });
  });

  it('feeds the search command with the filters and the pagination', () => {
    const companyId = uuidv7();
    const clientId = uuidv7();

    const command = SearchClaimCommand.fromInput(
      searchClaimSchema.parse({ q: ' netflix ', status: 'open', channel: 'bot', clientId, limit: '25', offset: '25' }),
      companyId,
    );

    expect(command).toMatchObject({
      companyId,
      limit: 25,
      offset: 25,
      filters: { q: 'netflix', status: 'open', channel: 'bot', clientId },
    });
  });
});
