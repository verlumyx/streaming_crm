import { v7, validate, version } from 'uuid';

/** UUID v7 (time-ordered). Used for every primary key in the app. */
export function uuidv7(): string {
  return v7();
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && validate(value) && version(value) >= 1;
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
