/** Verifies a plain password against the stored credential hash. */
export interface PasswordVerifier {
  verify(hash: string, password: string): Promise<boolean>;
}

/** Issues opaque bearer tokens and hashes them for storage/lookup. */
export interface ApiTokenFactory {
  newId(): string;
  issue(): { plain: string; hash: string };
  hash(plain: string): string;
}
