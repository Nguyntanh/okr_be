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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: ExpressResponse, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

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

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
