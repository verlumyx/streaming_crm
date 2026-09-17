import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { db } from '@/db/client';
import ContactPage from '@/app/contact/page';
import HomePage from '@/app/page';
import { proxy } from '@/proxy';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser } from '../../../helpers/session-mock';
import { createUser } from '../../../factories/user.factory';

describe('Página de contacto', () => {
  it('renders the form for guests', async () => {
    setSessionUser(null);

    const element = await ContactPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(element.props.sent).toBe(false);
    expect(html).toContain('href="/css/site.css"');
    expect(html).toContain('Contáctenos');
    expect(html).toContain('name="website"');
  });

  it('renders the thank-you state after submitting', async () => {
    const element = await ContactPage({ searchParams: Promise.resolve({ sent: '1' }) });
    const html = renderToStaticMarkup(element);

    expect(element.props.sent).toBe(true);
    expect(html).toContain('¡Gracias por contactarnos!');
    expect(html).toContain('Gracias por contactarnos. Te responderemos pronto.');
  });
});

describe('Landing (welcome)', () => {
  beforeEach(resetDb);

  it('the landing page renders for guests with a login link', async () => {
    setSessionUser(null);

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain('href="/css/site.css"');
    expect(html).toContain('Iniciar sesión');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/contact"');
    expect(html).not.toContain('Ir al panel');
  });

  it('the landing page offers the panel when the visitor already has a session', async () => {
    setSessionUser(await createUser(db));

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain('Ir al panel');
    expect(html).toContain('href="/dashboard"');
  });
});

describe('Proxy: rutas públicas', () => {
  const request = (path: string) => new NextRequest(new URL(path, 'http://localhost:3001'));

  /** A request carrying a session cookie, valid or not — the proxy cannot tell them apart. */
  const withSessionCookie = (path: string) => {
    const next = request(path);
    next.cookies.set('streaming-crm.session_token', 'cualquier-token');
    return next;
  };

  it('lets guests reach the landing and the contact page', () => {
    expect(proxy(request('/')).headers.get('location')).toBeNull();
    expect(proxy(request('/contact')).headers.get('location')).toBeNull();
  });

  it('still sends guests to the login for private paths', () => {
    expect(proxy(request('/dashboard')).headers.get('location')).toBe('http://localhost:3001/login');
    expect(proxy(request('/something')).headers.get('location')).toBe('http://localhost:3001/login');
  });

  it('lets a request with a session cookie through to a private path', () => {
    expect(proxy(withSessionCookie('/dashboard')).headers.get('location')).toBeNull();
  });

  /**
   * Regression: the proxy used to send any request carrying a cookie from `/login` to `/dashboard`.
   * A cookie that no longer validates then bounced straight back, looping forever with no way out
   * but clearing cookies by hand. Only a real session may send someone away from the login page,
   * and that is decided by the page itself.
   */
  it('never bounces a request off the login page, even when it carries a stale cookie', () => {
    expect(proxy(withSessionCookie('/login')).headers.get('location')).toBeNull();
    expect(proxy(request('/login')).headers.get('location')).toBeNull();
  });
});
