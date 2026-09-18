import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { user } from '@/db/auth-schema';
import { clients } from '@/modules/client/models/client.model';
import { profiles } from '@/modules/account/models/account.model';
import { sales, saleProfiles } from '@/modules/sale/models/sale.model';
import { transactions } from '@/modules/transaction/models/transaction.model';
import { botEvents } from '@/modules/bot/models/bot-event.model';
import { botContacts, botConversations, botMessages } from '@/modules/conversation/models/conversation.model';
import { createBotContainer } from '@/modules/bot/container';
import { createConversationContainer } from '@/modules/conversation/container';
import { POST } from '@/app/api/bot/webhooks/whatsapp/[channelId]/route';
import { resetDb } from '../../../helpers/reset-db';
import { makeSaleContext } from '../../../helpers/sale-context';
import { seedBotSettings, seedChannel, whatsappRequest, whatsappTextPayload } from '../../../helpers/bot-context';
import { FakeChatModel, FakeEmbeddingModel, type ScriptedTurn } from '../../../unit/modules/bot/fake-ai';
import { MetaCloudChannelGateway } from '@/modules/bot/channels/whatsapp/meta-cloud.gateway';
import { AiUnavailableException } from '@/modules/bot/exceptions/ai-unavailable.exception';
import type { ChatModel } from '@/modules/bot/infrastructure/ai-ports';
import type { BotChannelRow } from '@/modules/bot/models/bot-channel.model';

const params = (channelId: string) => ({ params: Promise.resolve({ channelId }) });
const embeddings = new FakeEmbeddingModel();

/** The quota is spent: every model of the chain refuses, exactly as the provider does. */
const unavailable: ChatModel = {
  generate: async () => {
    throw new AiUnavailableException('El modelo no respondió: 429 RESOURCE_EXHAUSTED');
  },
};

/** A gateway that records what the bot would send instead of calling Graph. */
class RecordingGateway extends MetaCloudChannelGateway {
  readonly sent: { to: string; text: string }[] = [];

  async send(to: string, text: string): Promise<{ externalMessageId: string }> {
    this.sent.push({ to, text });
    return { externalMessageId: `wamid.OUT.${this.sent.length}` };
  }
}

async function context(script: ScriptedTurn[]) {
  const sale = await makeSaleContext(db, 4);
  const settings = await seedBotSettings(db, sale.company.id, { status: 'active' });
  const channel = await seedChannel(db, sale.company.id);
  const chat = new FakeChatModel(script);
  return { sale, settings, channel, chat };
}

async function deliver(channel: BotChannelRow, text: string, from?: string) {
  const response = await POST(
    whatsappRequest(channel.id, whatsappTextPayload(text, { from })),
    params(channel.id),
  );
  expect(response.status).toBe(200);
}

const drain = (chat: FakeChatModel, gateway: RecordingGateway) =>
  createBotContainer(db, { chat, embeddings, gatewayFor: () => gateway }).drainService(10);

describe('El bot atiende un mensaje entrante', () => {
  beforeEach(resetDb);

  it('creates the contact, the thread and answers with the model text', async () => {
    const { sale, channel, chat } = await context([{ text: 'Hola, tenemos Netflix desde 10 USD.' }]);
    const gateway = new RecordingGateway();
    const sent = gateway.sent;

    await deliver(channel, 'Hola, ¿qué tienen?');
    const report = await drain(chat, gateway);

    expect(report).toMatchObject({ claimed: 1, answered: 1 });
    const [contact] = await db.select().from(botContacts).where(eq(botContacts.companyId, sale.company.id));
    expect(contact).toMatchObject({ externalId: '584121234567', phoneE164: '+584121234567', status: 'active' });

    const [conversation] = await db.select().from(botConversations);
    expect(conversation).toMatchObject({ code: 'CNV000001', status: 'open', handledBy: 'bot' });

    expect(sent).toEqual([{ to: '584121234567', text: 'Hola, tenemos Netflix desde 10 USD.' }]);
    const stored = await db.select().from(botMessages).where(eq(botMessages.conversationId, conversation.id));
    expect(stored.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(stored.find((m) => m.role === 'assistant')).toMatchObject({ status: 'sent', externalMessageId: 'wamid.OUT.1' });

    const [event] = await db.select().from(botEvents);
    expect(event.status).toBe('completed');
  });

  it('links the contact to an existing client by phone', async () => {
    const { sale, channel, chat } = await context([{ text: 'Hola de nuevo.' }]);
    await db.update(clients).set({ phoneE164: '+584121234567' }).where(eq(clients.id, sale.client.id));
    const gateway = new RecordingGateway();

    await deliver(channel, 'Hola');
    await drain(chat, gateway);

    const [contact] = await db.select().from(botContacts);
    expect(contact.clientId).toBe(sale.client.id);
  });

  it('registers the client and a sale that stays por aprobar', async () => {
    const { sale, channel } = await context([]);
    const chat = new FakeChatModel([
      { functionCalls: [{ name: 'listar_catalogo', args: {} }] },
      { functionCalls: [{ name: 'registrar_cliente', args: { nombre: 'Camila Rojas' } }] },
      { functionCalls: [{ name: 'crear_venta', args: { planCodigo: sale.plan.code } }] },
      { text: 'Listo, tu venta quedó registrada. Envíame el comprobante.' },
    ]);
    const gateway = new RecordingGateway();
    const sent = gateway.sent;

    await deliver(channel, 'Quiero Netflix');
    const report = await drain(chat, gateway);

    expect(report).toMatchObject({ claimed: 1, answered: 1, failed: 0 });
    expect(sent).toHaveLength(1);

    const created = await db.select().from(clients).where(eq(clients.name, 'Camila Rojas'));
    expect(created).toHaveLength(1);
    expect(created[0].phoneE164).toBe('+584121234567');

    const [bot] = await db
      .select()
      .from(user)
      .where(eq(user.email, `bot+${sale.company.id}@bot.local`));
    const registered = await db.select().from(sales).where(eq(sales.clientId, created[0].id));
    expect(registered).toHaveLength(1);
    expect(registered[0]).toMatchObject({ status: 'pending', agentId: bot.id, approvedAt: null });

    // Committed but not delivered: no profile occupied and no income until a human approves.
    expect(await db.select().from(saleProfiles).where(eq(saleProfiles.saleId, registered[0].id))).toHaveLength(1);
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, (await db.select().from(saleProfiles))[0].profileId));
    expect(profile.status).toBe('available');
    expect(await db.select().from(transactions)).toHaveLength(0);

    const toolMessages = await db.select().from(botMessages).where(eq(botMessages.role, 'tool'));
    expect(toolMessages.map((m) => m.toolName)).toEqual(['listar_catalogo', 'registrar_cliente', 'crear_venta']);
  });

  it('does not sell the same profile twice: the second sale finds no stock', async () => {
    const { sale, channel } = await context([]);
    const script: ScriptedTurn[] = [
      { functionCalls: [{ name: 'registrar_cliente', args: { nombre: 'Cliente Uno' } }] },
      { functionCalls: [{ name: 'crear_venta', args: { planCodigo: sale.plan.code } }] },
      { text: 'Registrada.' },
    ];
    const gateway = new RecordingGateway();

    // Four profiles, four buyers: the fifth has nothing left.
    for (let i = 0; i < 5; i++) {
      await deliver(channel, 'Quiero Netflix', `58412000000${i}`);
      await drain(new FakeChatModel(script), gateway);
    }

    const registered = await db.select().from(sales);
    expect(registered).toHaveLength(4);
    expect(new Set(registered.map((s) => s.id)).size).toBe(4);
    const pivots = await db.select().from(saleProfiles);
    expect(new Set(pivots.map((p) => p.profileId)).size).toBe(4);
  });

  it('stays silent while a human has the conversation', async () => {
    const { channel, chat } = await context([{ text: 'No debería responder.' }]);
    const gateway = new RecordingGateway();
    const sent = gateway.sent;
    await deliver(channel, 'Hola');
    await drain(new FakeChatModel([{ text: 'Primera respuesta.' }]), gateway);

    const [conversation] = await db.select().from(botConversations);
    await createConversationContainer(db).handoffService.execute(conversation.id, 'El cliente lo pidió', null, 60);

    await deliver(channel, '¿Sigues ahí?');
    const report = await drain(chat, gateway);

    expect(report).toMatchObject({ claimed: 1, silenced: 1, answered: 0 });
    // The inbound message is still stored so the agent can read it.
    expect(sent).toHaveLength(1);
    expect(chat.requests).toHaveLength(0);
    const inbound = await db.select().from(botMessages).where(eq(botMessages.role, 'user'));
    expect(inbound).toHaveLength(2);
  });

  it('stays silent when the assistant is switched off, and keeps the message', async () => {
    const { sale, channel, chat } = await context([{ text: 'No debería responder.' }]);
    await seedBotSettings(db, sale.company.id, { status: 'inactive' });
    const gateway = new RecordingGateway();
    const sent = gateway.sent;

    await deliver(channel, 'Hola');
    const report = await drain(chat, gateway);

    expect(report).toMatchObject({ silenced: 1, answered: 0 });
    expect(sent).toEqual([]);
    expect(await db.select().from(botMessages).where(eq(botMessages.role, 'user'))).toHaveLength(1);
  });

  it('stays silent for a blocked contact without calling the model', async () => {
    const { channel, chat } = await context([{ text: 'No debería responder.' }]);
    const gateway = new RecordingGateway();
    const sent = gateway.sent;
    await deliver(channel, 'Hola');
    await drain(new FakeChatModel([{ text: 'Primera.' }]), gateway);

    const [contact] = await db.select().from(botContacts);
    await createConversationContainer(db).repository.blockContact(contact.id, contact.companyId, 'spam', null);

    await deliver(channel, 'Otra vez');
    await drain(chat, gateway);

    expect(sent).toHaveLength(1);
    expect(chat.requests).toHaveLength(0);
  });

  it('never answers the same event twice, even if the worker runs again', async () => {
    const { channel } = await context([]);
    const gateway = new RecordingGateway();
    const sent = gateway.sent;

    await deliver(channel, 'Hola');
    await drain(new FakeChatModel([{ text: 'Respuesta única.' }]), gateway);

    // Force a retry of the very same event.
    const [event] = await db.select().from(botEvents);
    await createBotContainer(db).eventRepository.requeue(event.id, event.companyId);
    const second = await drain(new FakeChatModel([{ text: 'Respuesta duplicada.' }]), gateway);

    expect(second).toMatchObject({ claimed: 1, answered: 1 });
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toBe('Respuesta única.');
  });

  it('retries an event that failed at the model, without duplicating the inbound message', async () => {
    const { channel } = await context([]);
    const gateway = new RecordingGateway();
    const sent = gateway.sent;

    await deliver(channel, '¿Qué planes tienes?');
    const first = await createBotContainer(db, {
      chat: unavailable,
      embeddings,
      gatewayFor: () => gateway,
    }).drainService(10);

    expect(first).toMatchObject({ claimed: 1, failed: 1, answered: 0 });
    expect(sent).toEqual([]);

    // The inbound message is already stored, so the retry must not trip over its unique id.
    const [failed] = await db.select().from(botEvents);
    expect(failed.status).toBe('failed');
    await createBotContainer(db).eventRepository.requeue(failed.id, failed.companyId);

    const second = await drain(new FakeChatModel([{ text: 'Tenemos Netflix desde 10 USD.' }]), gateway);

    expect(second).toMatchObject({ claimed: 1, answered: 1, failed: 0 });
    expect(sent).toEqual([{ to: '584121234567', text: 'Tenemos Netflix desde 10 USD.' }]);
    expect(await db.select().from(botMessages).where(eq(botMessages.role, 'user'))).toHaveLength(1);
    const [conversation] = await db.select().from(botConversations);
    expect(conversation.messageCount).toBe(2);
  });

  it('escalates instead of going quiet when the model loops on tools', async () => {
    const { sale, channel } = await context([]);
    await seedBotSettings(db, sale.company.id, { status: 'active', maxToolIterations: 2 });
    const looping = new FakeChatModel(
      Array.from({ length: 5 }, () => ({ functionCalls: [{ name: 'listar_catalogo', args: {} }] })),
    );
    const gateway = new RecordingGateway();
    const sent = gateway.sent;

    await deliver(channel, 'Hola');
    const report = await drain(looping, gateway);

    expect(report).toMatchObject({ silenced: 1 });
    expect(sent).toEqual([]);
    const [conversation] = await db.select().from(botConversations);
    expect(conversation).toMatchObject({ handledBy: 'human' });
  });

  it('keeps each company isolated: a contact only ever sees its own catalogue', async () => {
    const a = await context([{ functionCalls: [{ name: 'listar_catalogo', args: {} }] }, { text: 'Ahí va.' }]);
    const b = await makeSaleContext(db, 2);
    const gateway = new RecordingGateway();

    await deliver(a.channel, 'Quiero ver planes');
    await drain(a.chat, gateway);

    const toolMessage = (await db.select().from(botMessages).where(eq(botMessages.role, 'tool')))[0];
    const planes = (toolMessage.toolResult as { planes: { planCodigo: string }[] }).planes;
    const otherPlans = await db
      .select()
      .from(sales)
      .where(and(eq(sales.companyId, b.company.id)));

    expect(planes.map((p) => p.planCodigo)).toEqual([a.sale.plan.code]);
    expect(otherPlans).toHaveLength(0);
  });
});
