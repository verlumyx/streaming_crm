import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeftIcon } from '@/app/(auth)/_components/AuthIcons';
import { StreamCrmLogo } from '@/app/(auth)/_components/StreamCrmLogo';

export const SUPPORT_EMAIL = 'soporte@streamcrm.cl';

interface AuthBrand {
  title: string;
  text: string;
  quote: string;
  quoteBy: string;
  /** Show the three mini metrics under the text (login only). */
  showStats?: boolean;
}

interface AuthShellProps {
  brand: AuthBrand;
  /** Top-right slot: contact link (login) or "back to login" (every other page). */
  top?: 'contact' | 'back';
  children: ReactNode;
}

/** Two-column branded auth page: brand panel (hidden on small screens) + centered card. */
export function AuthShell({ brand, top = 'back', children }: AuthShellProps) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <Link className="logo" href="/login">
          <StreamCrmLogo />
        </Link>
        <div className="auth-brand-body">
          <h2>{brand.title}</h2>
          <p>{brand.text}</p>
          {brand.showStats && (
            <div className="auth-mini">
              <div className="m">
                <div className="mv">$241k</div>
                <div className="ml">Ganancia / mes</div>
              </div>
              <div className="m">
                <div className="mv">52</div>
                <div className="ml">Perfiles activos</div>
              </div>
              <div className="m">
                <div className="mv">9</div>
                <div className="ml">Plataformas</div>
              </div>
            </div>
          )}
          <div className="auth-quote">
            {brand.quote}
            <span>— {brand.quoteBy}</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-top">
          {top === 'back' ? (
            <>
              <Link className="auth-back" href="/login">
                <ArrowLeftIcon /> Volver a iniciar sesión
              </Link>
              <Link className="logo" href="/login">
                <StreamCrmLogo simple />
              </Link>
            </>
          ) : (
            <>
              <Link className="logo" href="/login">
                <StreamCrmLogo simple />
              </Link>
              <span className="alt">
                ¿Necesitas una cuenta? <a href={`mailto:${SUPPORT_EMAIL}`}>Contáctanos</a>
              </span>
            </>
          )}
        </div>

        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
