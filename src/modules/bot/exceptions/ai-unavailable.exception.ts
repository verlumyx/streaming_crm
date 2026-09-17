import { DomainError } from '@/modules/shared/exceptions/domain-error';

/** Every model of the fallback chain refused (quota, key, outage). The event is retried later. */
export class AiUnavailableException extends DomainError {
  constructor(message = 'El asistente no está disponible en este momento. Inténtalo más tarde.') {
    super(message);
    this.name = 'AiUnavailableException';
  }
}
