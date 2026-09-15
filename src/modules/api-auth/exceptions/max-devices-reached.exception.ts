import { DomainError } from '@/modules/shared/exceptions/domain-error';

export class MaxDevicesReachedException extends DomainError {
  readonly status = 403;

  constructor() {
    super('Has alcanzado el máximo de dispositivos permitidos. Cierra sesión en otro dispositivo para continuar.');
    this.name = 'MaxDevicesReachedException';
  }
}
