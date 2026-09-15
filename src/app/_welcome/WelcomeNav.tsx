'use client';

import Link from 'next/link';
import { useState } from 'react';
import { StreamCrmLogo } from '@/components/streamcrm-logo';

type Props = { panelHref: string; panelLabel: string; contactHref: string };

/** Sticky landing nav; the only interactive bit of the landing page (mobile menu toggle). */
export function WelcomeNav({ panelHref, panelLabel, contactHref }: Props) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="site-nav">
      <div className="wrap nav-inner">
        <Link className="logo" href="/">
          <StreamCrmLogo />
        </Link>
        <nav className={navOpen ? 'nav-links open' : 'nav-links'}>
          <a href="#funciones">Funciones</a>
          <a href="#plataformas">Plataformas</a>
          <a href="#precios">Precios</a>
          <a href="#empresa">Empresa</a>
        </nav>
        <div className="nav-cta">
          <Link className="btn btn-ghost btn-sm" href={panelHref}>
            {panelLabel}
          </Link>
          <Link className="btn btn-brand btn-sm" href={contactHref}>
            Contáctenos
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm nav-toggle"
            aria-label="Menú"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
