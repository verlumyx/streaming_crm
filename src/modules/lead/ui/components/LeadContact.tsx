import Link from 'next/link';
import { StreamCrmLogo } from '@/components/streamcrm-logo';
import { LeadCreate } from './LeadCreate';

export const LEAD_SENT_MESSAGE = 'Gracias por contactarnos. Te responderemos pronto.';

/** Public contact page: brand panel + form card, or the thank-you state once sent. Server component. */
export function LeadContact({ sent }: { sent: boolean }) {
  return (
    <>
      {/* Page-scoped stylesheet of the public site (rendered in place, removed when leaving the page). */}
      <link rel="stylesheet" href="/css/site.css" />

      <div className="auth">
        <aside className="auth-brand">
          <Link className="logo" href="/">
            <StreamCrmLogo />
          </Link>
          <div className="auth-brand-body">
            <h2>Hablemos de tu negocio.</h2>
            <p>
              Déjanos tus datos y te contactamos para mostrarte cómo StreamCRM ordena tus clientes, perfiles y
              cobros en un solo lugar.
            </p>
            <div className="auth-quote">
              “Me escribieron al día siguiente y en una llamada ya tenía todo claro.”
              <span>— Revendedor Pro</span>
            </div>
          </div>
        </aside>

        <main className="auth-main">
          <div className="auth-top">
            <Link className="auth-back" href="/">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>{' '}
              Volver al inicio
            </Link>
            <Link className="logo" href="/">
              <StreamCrmLogo simple />
            </Link>
          </div>

          <div className="auth-card">
            {sent ? (
              <div className="sent">
                <div className="big-ico">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                    <path d="m3 7 9 6 9-6" />
                    <path d="m16 15 2 2 4-4" />
                  </svg>
                </div>
                <h1>¡Gracias por contactarnos!</h1>
                <p className="sub">{LEAD_SENT_MESSAGE}</p>
                <Link className="btn btn-ghost btn-block" href="/" style={{ marginTop: 26 }}>
                  Volver al inicio
                </Link>
              </div>
            ) : (
              <div>
                <h1>Contáctenos</h1>
                <p className="sub">Cuéntanos quién eres y cómo ubicarte. Te responderemos a la brevedad.</p>

                <LeadCreate />

                <p className="alt-foot">
                  ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
