import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

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
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async signIn(
    email: string,
    pass: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
    };
  }> {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const result = { ...user };
    delete result.password;

    void asJwtPayload(result);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  private async generateTokens(userId: bigint, email: string, role: string) {
    const payload = { sub: userId.toString(), email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: bigint, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        hashedToken,
        expiresAt,
      },
    });
  }

  async refreshTokens(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    const userId = BigInt(payload.sub);

    const userTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    let matchingTokenRecord = null;
    for (const tokenRecord of userTokens) {
      const isMatched = await bcrypt.compare(
        rawRefreshToken,
        tokenRecord.hashedToken,
      );
      if (isMatched) {
        matchingTokenRecord = tokenRecord;
        break;
      }
    }

    if (!matchingTokenRecord) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchingTokenRecord.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User không tồn tại');

    const newTokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, newTokens.refreshToken);

    return newTokens;
  }

  async signout(rawRefreshToken: string) {
    if (!rawRefreshToken) return;

    try {
      const payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const userId = BigInt(payload.sub);

      const userTokens = await this.prisma.refreshToken.findMany({
        where: { userId, isRevoked: false },
      });

      for (const tokenRecord of userTokens) {
        const isMatched = await bcrypt.compare(
          rawRefreshToken,
          tokenRecord.hashedToken,
        );
        if (isMatched) {
          await this.prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { isRevoked: true },
          });
          break;
        }
      }
    } catch {
      // Token không hợp lệ thì bỏ qua
    }
  }
}
