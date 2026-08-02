import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

const serializeBigInt = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeBigInt(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeBigInt(item)]),
    );
  }

  return value;
};

const asJwtPayload = (value: unknown): Record<string, unknown> => {
  const serialized = serializeBigInt(value);

  if (
    serialized &&
    typeof serialized === 'object' &&
    !Array.isArray(serialized)
  ) {
    return serialized as Record<string, unknown>;
  }

  return {};
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password: _password, ...result } = user;

    const access_token = this.jwtService.sign(asJwtPayload(result));

    return { access_token };
  }
}
