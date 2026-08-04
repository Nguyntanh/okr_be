import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * AuthGuard là một implement của CanActivate interface trong NestJS.
 * Nhiệm vụ của nó là bảo vệ các route yêu cầu xác thực.
 * Nó sẽ kiểm tra sự tồn tại và tính hợp lệ của JWT Access Token trong header của request.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  // Inject JwtService để có thể xác thực và giải mã token.
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Phương thức chính được NestJS gọi để quyết định một request có được phép tiếp tục hay không.
   * @param context - Cung cấp thông tin về request đang được xử lý.
   * @returns Trả về `true` nếu request hợp lệ, ngược lại sẽ ném ra `UnauthorizedException`.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy đối tượng request từ ExecutionContext.
    const request = context.switchToHttp().getRequest();
    // Trích xuất token từ header 'Authorization'.
    const token = this.extractTokenFromHeader(request);

    // Nếu không có token, ném lỗi 401 Unauthorized.
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      // Xác thực token bằng secret key. Nếu token hợp lệ và chưa hết hạn,
      // `verifyAsync` sẽ trả về payload của token.
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      // Gắn payload (chứa thông tin người dùng như id, email, role) vào đối tượng request.
      // Điều này cho phép các controller và service sau đó có thể truy cập thông tin người dùng.
      request.user = payload;
      return true;
    } catch {
      // Nếu token không hợp lệ (sai chữ ký, đã hết hạn, etc.), ném lỗi 401.
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Một phương thức private để trích xuất JWT từ header 'Authorization'.
   * Header phải có định dạng 'Bearer <token>'.
   * @param request - Đối tượng Express Request.
   * @returns Chuỗi token nếu tìm thấy, ngược lại trả về `undefined`.
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
