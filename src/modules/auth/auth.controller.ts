import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Res,
  Req,
} from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

/**
 * Controller chịu trách nhiệm xử lý các yêu cầu liên quan đến xác thực
 * như đăng nhập, đăng xuất, làm mới token và lấy thông tin người dùng.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Thiết lập refresh token vào cookie của response.
   * Cookie được cấu hình là httpOnly để tăng cường bảo mật, chống lại các cuộc tấn công XSS.
   * @param res - Đối tượng Express Response.
   * @param refreshToken - Chuỗi refresh token.
   */
  private setRefreshTokenCookie(res: ExpressResponse, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  /**
   * Xử lý yêu cầu đăng nhập của người dùng.
   * @param body - Chứa email và password từ client.
   * @param res - Đối tượng Express Response để thiết lập cookie.
   * @returns Trả về access token và thông tin cơ bản của người dùng.
   */
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.signIn(body.email, body.password);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      access_token: result.accessToken,
      user: result.user,
    };
  }

  /**
   * Làm mới access token bằng cách sử dụng refresh token từ cookie.
   * @param req - Đối tượng Express Request để đọc cookie.
   * @param res - Đối tượng Express Response để thiết lập cookie refresh token mới (nếu có rotation).
   * @returns Trả về access token mới.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    const newTokens = await this.authService.refreshTokens(refreshToken);

    this.setRefreshTokenCookie(res, newTokens.refreshToken);

    return {
      access_token: newTokens.accessToken,
    };
  }

  /**
   * Xử lý yêu cầu đăng xuất.
   * @param req - Đối tượng Express Request để đọc refresh token từ cookie.
   * @param res - Đối tượng Express Response để xóa cookie.
   * @returns Một thông báo xác nhận đăng xuất thành công.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    await this.authService.signOut(refreshToken);

    res.clearCookie('refreshToken', { path: '/auth' });

    return { message: 'Đăng xuất thành công' };
  }

  /**
   * Endpoint được bảo vệ, chỉ có thể truy cập khi có access token hợp lệ.
   * @param req - Request object, đã được AuthGuard gắn thông tin người dùng vào `req.user`.
   * @returns Thông tin người dùng được giải mã từ JWT payload.
   */
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
