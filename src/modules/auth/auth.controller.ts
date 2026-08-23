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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@ApiTags('Auth (Xác thực)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: ExpressResponse, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true, // HTTPS trên Vercel
      sameSite: 'none', // Bắt buộc cho Cross-origin giữa okr-fe và okr-be trên Vercel
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Đăng nhập bằng Email và Password',
  })
  async signIn(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.signIn(body.email, body.password);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      access_token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Làm mới Access Token thông qua Refresh Token trong cookie hoặc body',
  })
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
    @Body() body?: { refreshToken?: string },
  ) {
    const refreshToken = req.cookies?.['refreshToken'] || body?.refreshToken;
    const newTokens = await this.authService.refreshTokens(refreshToken);

    this.setRefreshTokenCookie(res, newTokens.refreshToken);

    return {
      access_token: newTokens.accessToken,
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng xuất tài khoản và thu hồi Refresh Token',
  })
  async signOut(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
    @Body() body?: { refreshToken?: string },
  ) {
    const refreshToken = req.cookies?.['refreshToken'] || body?.refreshToken;
    await this.authService.signOut(refreshToken);

    res.clearCookie('refreshToken', {
      path: '/',
      secure: true,
      sameSite: 'none',
    });

    return { message: 'Đăng xuất thành công' };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('profile')
  @ApiOperation({
    summary: 'Lấy thông tin tài khoản đang đăng nhập kèm Roles và Permissions',
    description:
      'Trả về thông tin chi tiết user cùng danh sách quyền hạn (permissions) và vai trò (roles) để Frontend phân quyền hiển thị giao diện.',
  })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }
}
