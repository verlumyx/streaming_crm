import { Mail, MailCheck } from 'lucide-react';
import { StatusPill } from '@/components/status-pill';

/** Email verification state (`users.email_verified`). */
export function UserVerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <StatusPill kind="activo" dot={false}>
      <MailCheck className="size-3.5" />
      Verificado
    </StatusPill>
  ) : (
    <StatusPill kind="pendiente" dot={false}>
      <Mail className="size-3.5" />
      Pendiente
    </StatusPill>
  );
}
