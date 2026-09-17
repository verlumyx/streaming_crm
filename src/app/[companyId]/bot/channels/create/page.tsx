import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { botRoutes } from '@/modules/bot/routes';
import { BotChannelCreate } from '@/modules/bot/ui/components/BotChannelCreate';

export const metadata: Metadata = { title: 'Conectar canal' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear. */
export default async function BotChannelCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.CHANNELS);

  return (
    <PageShell
      back={<BackLink href={botRoutes.channels(companyId)}>Canales</BackLink>}
      title="Conectar canal"
      subtitle="Las credenciales se guardan cifradas. Al guardar verás la URL del webhook."
    >
      <BotChannelCreate companyId={companyId} initialId={uuidv7()} />
    </PageShell>
  );
}
