import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, twoFactor } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/db/client';
import * as schema from '@/db/schema';
import { uuidv7 } from '@/modules/shared/uuid';

export const auth = betterAuth({
  appName: 'Streaming CRM',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // Extra origins allowed to call the auth API (comma separated). In development the dev server
  // may fall back to 3001 when 3000 is taken, so both are trusted.
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: false,
  }),
  emailAndPassword: {
    enabled: true,
    // No public sign-up: users are created from the Users module (admin plugin).
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // MAIL_MAILER=log in the original project: log the link until an email provider is configured.
      console.info(`[auth] password reset for ${user.email}: ${url}`);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.info(`[auth] verify email for ${user.email}: ${url}`);
    },
  },
  user: {
    additionalFields: {
      isSystemOwner: { type: 'boolean', defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // remember-me style, 7 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    database: { generateId: () => uuidv7() },
    cookiePrefix: 'streaming-crm',
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/two-factor/verify-totp': { window: 60, max: 5 },
    },
  },
  plugins: [
    twoFactor({ issuer: 'Streaming CRM' }),
    admin(),
    nextCookies(), // must be last
  ],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
