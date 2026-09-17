import type { Metadata } from 'next';
import { db } from '@/db/client';
import { PageShell } from '@/components/page-shell';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createBotContainer } from '@/modules/bot/container';
import { toBotSettingsDto } from '@/modules/bot/serializers/bot-settings.serializer';
import { BotSettingsEdit } from '@/modules/bot/ui/components/BotSettingsEdit';
import { BotSetupCard } from '@/modules/bot/ui/components/BotSetupCard';

export const metadata: Metadata = { title: 'Configuración del bot' };

type Props = { params: Promise<{ companyId: string }> };

export default async function BotSettingsPage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.CONFIGURE);

  const settings = await createBotContainer(db).settingsFindService.execute(companyId);

  return (
    <PageShell
      title="Configuración del bot"
      subtitle="Cómo se presenta el asistente, qué puede cerrar por su cuenta y cómo razona."
    >
      {settings ? (
        <BotSettingsEdit companyId={companyId} settings={toBotSettingsDto(settings)} />
      ) : (
        <BotSetupCard companyId={companyId} />
      )}
    </PageShell>
  );
}
