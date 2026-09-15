import { z } from 'zod';

export type TotpSetupData = { uri: string; secret: string; issuer: string | null; account: string | null };

/**
 * Parses the `otpauth://totp/...` URI returned by `authClient.twoFactor.enable` into the
 * pieces shown for manual entry in an authenticator app.
 */
export const totpUriSchema = z.string().transform((uri, ctx): TotpSetupData => {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'El enlace de configuración no es válido.' });
    return z.NEVER;
  }

  const secret = url.searchParams.get('secret');
  if (url.protocol !== 'otpauth:' || !secret) {
    ctx.addIssue({ code: 'custom', message: 'El enlace de configuración no es válido.' });
    return z.NEVER;
  }

  const label = decodeURIComponent(url.pathname.replace(/^\/+/, '').replace(/^totp\//, ''));
  const separator = label.indexOf(':');
  const labelIssuer = separator >= 0 ? label.slice(0, separator) : null;
  const labelAccount = separator >= 0 ? label.slice(separator + 1) : label;

  return {
    uri,
    secret,
    issuer: url.searchParams.get('issuer') ?? labelIssuer ?? null,
    account: labelAccount || null,
  };
});
