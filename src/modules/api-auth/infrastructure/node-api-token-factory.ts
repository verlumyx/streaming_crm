import { createHash, randomBytes } from 'node:crypto';
import { uuidv7 } from '@/modules/shared/uuid';
import type { ApiTokenFactory } from '../services/ports';

export class NodeApiTokenFactory implements ApiTokenFactory {
  newId(): string {
    return uuidv7();
  }

  issue(): { plain: string; hash: string } {
    const plain = randomBytes(32).toString('hex');
    return { plain, hash: this.hash(plain) };
  }

  hash(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }
}
