import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator khai báo các mã quyền (permission codes) cần thiết để truy cập endpoint.
 * Ví dụ: @RequirePermissions('user:create', 'user:update')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
