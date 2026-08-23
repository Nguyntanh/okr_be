import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator lấy thông tin người dùng từ request (đã được AuthGuard xác thực).
 * Ví dụ: getProfile(@CurrentUser() user: any) hoặc getUserId(@CurrentUser('sub') userId: string)
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
