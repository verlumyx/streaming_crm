import type { LoginInput } from '../validation/login.schema';

export class LoginCommand {
  constructor(
    readonly email: string,
    readonly password: string,
    readonly deviceName: string,
  ) {}

  static fromInput(input: LoginInput): LoginCommand {
    return new LoginCommand(input.email, input.password, input.device_name);
  }
}
