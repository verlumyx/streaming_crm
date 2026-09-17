import { describe, expect, it } from 'vitest';
import { matchesE164, toE164 } from '@/lib/phone';

describe('toE164', () => {
  it('keeps an explicit international number', () => {
    expect(toE164('+58 412 1234567')).toBe('+584121234567');
    expect(toE164('+1 (305) 555-0199')).toBe('+13055550199');
  });

  it('recognizes a known country code without the plus sign (WhatsApp `wa_id`)', () => {
    expect(toE164('584121234567')).toBe('+584121234567');
    expect(toE164('5215512345678')).toBe('+5215512345678');
  });

  it('prepends the default dial code to a local number', () => {
    expect(toE164('4121234567')).toBe('+584121234567');
    expect(toE164('91234567', '+56')).toBe('+5691234567');
  });

  it('drops the national trunk prefix a local number carries', () => {
    expect(toE164('0412-1234567')).toBe('+584121234567');
    expect(toE164('0412 123 4567')).toBe('+584121234567');
  });

  it('returns null when there is nothing usable', () => {
    expect(toE164(null)).toBeNull();
    expect(toE164('')).toBeNull();
    expect(toE164('   ')).toBeNull();
    expect(toE164('sin dígitos')).toBeNull();
  });

  it('returns null when the result is too short or too long to be a phone number', () => {
    expect(toE164('+12')).toBeNull();
    expect(toE164('+123456789012345678901234')).toBeNull();
  });
});

describe('matchesE164', () => {
  it('matches regardless of formatting', () => {
    expect(matchesE164('+58 412 1234567', '+584121234567')).toBe(true);
    expect(matchesE164('0412-1234567', '+584121234567')).toBe(true);
  });

  it('does not match a different number', () => {
    expect(matchesE164('+58 412 1234567', '+584129999999')).toBe(false);
  });

  it('refuses to match on a short suffix, which would link unrelated clients', () => {
    expect(matchesE164('4567', '+584121234567')).toBe(false);
    expect(matchesE164(null, '+584121234567')).toBe(false);
    expect(matchesE164('+584121234567', '4567')).toBe(false);
  });
});
