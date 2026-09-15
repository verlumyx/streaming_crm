import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class UserNameRequiredException extends ValidationError {
  constructor() {
    super('name', 'El nombre es obligatorio.');
    this.name = 'UserNameRequiredException';
  }
}
