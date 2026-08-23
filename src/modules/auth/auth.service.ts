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

/**
 * Service chịu trách nhiệm xử lý logic xác thực người dùng,
 * bao gồm đăng nhập, tạo và làm mới token, đăng xuất và nạp hồ sơ người dùng.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Xác thực thông tin đăng nhập của người dùng.
   * Nếu thành công, tạo và trả về access token, refresh token và thông tin người dùng.
   */
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
      roles: string[];
    };
  }> {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Lấy danh sách roles của user
    const userPermissionsInfo = await this.usersService.getUserPermissions(
      user.id,
    );

    // Tạo cặp token
    const tokens = await this.generateTokens(user.id, user.email);
    // Lưu refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        roles: userPermissionsInfo.roles.map((r) => r.code),
      },
    };
  }

  /**
   * Lấy chi tiết hồ sơ tài khoản đang đăng nhập kèm Roles và Permissions.
   */
  async getProfile(userIdStr: string) {
    const userId = BigInt(userIdStr);
    const [user, userPerms] = await Promise.all([
      this.usersService.findById(userId),
      this.usersService.getUserPermissions(userId),
    ]);

    return {
      ...user,
      isSuperAdmin: userPerms.isSuperAdmin,
      roles: userPerms.roles,
      roleCodes: userPerms.roles.map((r) => r.code),
      permissions: userPerms.permissions,
    };
  }

  /**
   * Tạo ra một cặp access token và refresh token.
   */
  private async generateTokens(userId: bigint, email: string) {
    const payload = { sub: userId.toString(), email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Hash và lưu refresh token vào cơ sở dữ liệu.
   */
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

  /**
   * Làm mới access token bằng cách sử dụng refresh token (Token Rotation).
   */
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

    const newTokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, newTokens.refreshToken);

    return newTokens;
  }

  /**
   * Xử lý đăng xuất bằng cách thu hồi refresh token.
   */
  async signOut(rawRefreshToken: string) {
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
      // Bỏ qua nếu token không hợp lệ
    }
  }
}
