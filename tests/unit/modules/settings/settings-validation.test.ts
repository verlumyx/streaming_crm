import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { updateProfileSchema } from '@/modules/settings/validation/update-profile.schema';
import { changePasswordSchema } from '@/modules/settings/validation/change-password.schema';
import { setDefaultCompanySchema } from '@/modules/settings/validation/set-default-company.schema';
import { totpUriSchema } from '@/modules/settings/validation/totp-uri.schema';
import {
  changePasswordErrors,
  RATE_LIMIT_MESSAGE,
  settingsAuthErrorMessage,
} from '@/modules/settings/validation/auth-error-messages';
import { isSettingsSection, settingsRoutes } from '@/modules/settings/routes';

const fieldErrors = (error: z.ZodError) => z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;

describe('updateProfileSchema', () => {
  it('trims and lower-cases the email', () => {
    expect(updateProfileSchema.parse({ name: '  Ana ', email: ' Ana@Example.COM ' })).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
    });
  });

  it('requires a name and a valid email up to 255 characters', () => {
    const result = updateProfileSchema.safeParse({ name: '', email: 'no-es-correo' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error).name?.[0]).toBe('El nombre es obligatorio.');
    expect(fieldErrors(result.error).email?.[0]).toBe('El correo no es válido.');

    const tooLong = updateProfileSchema.safeParse({ name: 'x'.repeat(256), email: `${'a'.repeat(250)}@x.com` });
    expect(tooLong.success).toBe(false);
    if (tooLong.success) return;
    expect(fieldErrors(tooLong.error).name?.[0]).toBe('El nombre no puede superar 255 caracteres.');
    expect(fieldErrors(tooLong.error).email?.[0]).toBe('El correo no puede superar 255 caracteres.');
  });
});

describe('changePasswordSchema', () => {
  it('accepts a valid change', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'password', password: 'new-password', passwordConfirmation: 'new-password' })
        .success,
    ).toBe(true);
  });

  it('requires the current password, 8+ characters and a matching confirmation', () => {
    const short = changePasswordSchema.safeParse({ currentPassword: '', password: 'short', passwordConfirmation: 'short' });
    expect(short.success).toBe(false);
    if (short.success) return;
    expect(fieldErrors(short.error).currentPassword?.[0]).toBe('La contraseña actual es obligatoria.');
    expect(fieldErrors(short.error).password?.[0]).toBe('La contraseña debe tener al menos 8 caracteres.');

    const mismatch = changePasswordSchema.safeParse({
      currentPassword: 'password',
      password: 'new-password',
      passwordConfirmation: 'other-password',
    });
    expect(mismatch.success).toBe(false);
    if (mismatch.success) return;
    expect(fieldErrors(mismatch.error).password?.[0]).toBe('La confirmación de la contraseña no coincide.');
  });
});

describe('setDefaultCompanySchema', () => {
  it('requires a uuid', () => {
    expect(setDefaultCompanySchema.safeParse({ companyId: 'nope' }).success).toBe(false);
    expect(setDefaultCompanySchema.safeParse({ companyId: '0192f3a0-0000-7000-8000-00000000c001' }).success).toBe(true);
  });
});

describe('totpUriSchema', () => {
  it('extracts the secret, issuer and account from the otpauth URI', () => {
    const uri = 'otpauth://totp/Streaming%20CRM:ana%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Streaming%20CRM&algorithm=SHA1&digits=6&period=30';

    expect(totpUriSchema.parse(uri)).toEqual({
      uri,
      secret: 'JBSWY3DPEHPK3PXP',
      issuer: 'Streaming CRM',
      account: 'ana@example.com',
    });
  });

  it('rejects anything that is not an otpauth URI with a secret', () => {
    expect(totpUriSchema.safeParse('https://example.com/?secret=ABC').success).toBe(false);
    expect(totpUriSchema.safeParse('otpauth://totp/x').success).toBe(false);
    expect(totpUriSchema.safeParse('not a url').success).toBe(false);
  });
});

describe('auth error messages', () => {
  it('maps a wrong current password to the currentPassword field', () => {
    expect(changePasswordErrors({ code: 'INVALID_PASSWORD', status: 400 })).toEqual({
      currentPassword: 'La contraseña actual es incorrecta.',
    });
    expect(changePasswordErrors({ code: 'PASSWORD_TOO_SHORT', status: 400 })).toEqual({
      password: 'La contraseña debe tener al menos 8 caracteres.',
    });
    expect(changePasswordErrors({ status: 429 })).toEqual({ form: RATE_LIMIT_MESSAGE });
    expect(changePasswordErrors({ code: 'SOMETHING', status: 500 }).form).toBe(
      'No pudimos actualizar la contraseña. Intenta de nuevo.',
    );
  });

  it('translates 2FA codes and falls back for unknown ones', () => {
    expect(settingsAuthErrorMessage({ code: 'INVALID_CODE', status: 400 }, 'x')).toBe('El código no es válido.');
    expect(settingsAuthErrorMessage({ code: 'NOPE', status: 400 }, 'fallback')).toBe('fallback');
    expect(settingsAuthErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('settingsRoutes', () => {
  it('builds company-scoped URLs and recognises sections', () => {
    expect(settingsRoutes.twoFactor('c1')).toBe('/c1/settings/two-factor');
    expect(settingsRoutes.section('c1', 'company')).toBe('/c1/settings/company');
    expect(isSettingsSection('appearance')).toBe(true);
    expect(isSettingsSection('delete')).toBe(false);
    expect(isSettingsSection(undefined)).toBe(false);
  });
});
