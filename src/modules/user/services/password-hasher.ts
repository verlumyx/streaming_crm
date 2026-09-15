/** Hashes plain passwords in the format better-auth verifies on sign-in. Injected from `container.ts`. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
}
