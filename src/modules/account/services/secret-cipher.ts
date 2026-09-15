/**
 * Symmetric cipher for secrets at rest (account passwords).
 * Services depend on this contract; `container.ts` wires the AES-256-GCM implementation from `@/modules/shared/crypto`.
 */
export interface SecretCipher {
  encrypt(plain: string): string;
  decrypt(payload: string): string;
}
