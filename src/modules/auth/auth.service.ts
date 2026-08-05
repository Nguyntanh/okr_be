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
 * Hàm đệ quy để chuyển đổi các giá trị BigInt thành chuỗi.
 * Cần thiết vì JSON.stringify không hỗ trợ BigInt.
 * @param value - Giá trị đầu vào, có thể là bất kỳ kiểu dữ liệu nào.
 * @returns Giá trị đã được chuyển đổi, với BigInt thành chuỗi.
 */
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

/**
 * Chuyển đổi một đối tượng thành một payload JWT hợp lệ.
 * @param value - Đối tượng cần chuyển đổi.
 * @returns Một đối tượng Record<string, unknown> có thể dùng làm payload.
 */
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

/**
 * Service chịu trách nhiệm xử lý logic xác thực người dùng,
 * bao gồm đăng nhập, tạo và làm mới token, và đăng xuất.
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
   * @param email - Email của người dùng.
   * @param pass - Mật khẩu của người dùng.
   * @returns Một đối tượng chứa token và thông tin người dùng.
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
    };
  }> {
    // Tìm người dùng trong cơ sở dữ liệu bằng email.
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // So sánh mật khẩu được cung cấp với mật khẩu đã hash trong DB.
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Xóa mật khẩu khỏi đối tượng người dùng trước khi xử lý tiếp.
    const result = { ...user };
    delete result.password;

    // Dòng này không có tác dụng gì vì kết quả không được gán, có thể xóa đi.
    void asJwtPayload(result);

    // Tạo một cặp access token và refresh token mới.
    const tokens = await this.generateTokens(user.id, user.email); // role parameter removed
    // Lưu refresh token đã được hash vào cơ sở dữ liệu.
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Trả về token và thông tin cơ bản của người dùng.
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  /**
   * Tạo ra một cặp access token và refresh token.
   * @param userId - ID của người dùng.
   * @param email - Email của người dùng.
   * @returns Một đối tượng chứa accessToken và refreshToken.
   */
  private async generateTokens(userId: bigint, email: string) {
    const payload = { sub: userId.toString(), email };

    // Tạo đồng thời cả hai token để tăng hiệu suất.
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

  /**
   * Hash và lưu refresh token vào cơ sở dữ liệu.
   * @param userId - ID của người dùng sở hữu token.
   * @param refreshToken - Chuỗi refresh token cần lưu.
   */
  private async saveRefreshToken(userId: bigint, refreshToken: string) {
    // Hash token trước khi lưu để tăng cường bảo mật.
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Lưu token đã hash vào bảng `refreshToken`.
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
   * @param rawRefreshToken - Refresh token thô từ cookie của client.
   * @returns Một cặp token mới.
   */
  async refreshTokens(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }

    let payload: any;
    // Xác thực refresh token.
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

    // Lấy tất cả các token chưa bị thu hồi và còn hạn của người dùng.
    const userTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    // Tìm bản ghi token trong DB khớp với refresh token được cung cấp.
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

    // Nếu không tìm thấy token khớp, có thể là dấu hiệu của việc token bị đánh cắp.
    if (!matchingTokenRecord) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    // Thu hồi refresh token cũ đã được sử dụng.
    await this.prisma.refreshToken.update({
      where: { id: matchingTokenRecord.id },
      data: { isRevoked: true },
    });

    // Lấy thông tin người dùng để tạo token mới.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User không tồn tại');

    // Tạo và lưu một cặp token hoàn toàn mới (token rotation).
    const newTokens = await this.generateTokens(user.id, user.email); // user.role removed
    await this.saveRefreshToken(user.id, newTokens.refreshToken);

    return newTokens;
  }

  /**
   * Xử lý đăng xuất bằng cách thu hồi refresh token.
   * @param rawRefreshToken - Refresh token thô từ cookie của client.
   */
  async signOut(rawRefreshToken: string) {
    // Nếu không có token, không cần làm gì cả.
    if (!rawRefreshToken) return;

    try {
      // Xác thực token để lấy `userId`.
      const payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const userId = BigInt(payload.sub);

      // Tìm các token của người dùng.
      const userTokens = await this.prisma.refreshToken.findMany({
        where: { userId, isRevoked: false },
      });

      // Tìm và thu hồi token khớp với token được cung cấp.
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
      // Nếu token không hợp lệ hoặc đã hết hạn, không cần làm gì thêm.
    }
  }
}
