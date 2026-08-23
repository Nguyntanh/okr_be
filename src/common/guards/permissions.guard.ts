import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * PermissionsGuard kiểm tra phân quyền động theo thời gian thực (Real-time RBAC).
 * - Đọc danh sách permissions yêu cầu từ metadata (@RequirePermissions).
 * - Tra cứu quyền hạn hiện tại của User trong Database (thông qua UserRole -> Role -> RolePermission -> Permission).
 * - Tự động cho phép đối với vai trò SUPER_ADMIN.
 * - Cập nhật thay đổi phân quyền ngay lập tức khi Admin chỉnh sửa trên bảng ma trận.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu endpoint không yêu cầu quyền cụ thể, cho phép truy cập
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException(
        'Yêu cầu xác thực trước khi kiểm tra quyền',
      );
    }

    let userId: bigint;
    try {
      userId = BigInt(user.sub);
    } catch {
      throw new UnauthorizedException('ID người dùng không hợp lệ');
    }

    // Lấy thông tin vai trò và quyền hạn của người dùng từ cơ sở dữ liệu
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const userPermissions = new Set<string>();
    const roles: string[] = [];

    for (const ur of userRoles) {
      const role = ur.role;
      if (!role) continue;

      roles.push(role.code);

      // Nếu là SUPER_ADMIN, có toàn quyền trên toàn bộ hệ thống
      if (role.code === 'SUPER_ADMIN') {
        request.userRoles = ['SUPER_ADMIN'];
        return true;
      }

      for (const rp of role.permissions) {
        if (rp.permission?.code) {
          userPermissions.add(rp.permission.code);
        }
      }
    }

    // Lưu roles và permissions vào request để các handler phía sau có thể tái sử dụng
    request.userRoles = roles;
    request.userPermissions = Array.from(userPermissions);

    // Kiểm tra xem người dùng có đầy đủ các quyền được yêu cầu không
    const hasRequiredPermissions = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasRequiredPermissions) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện hành động này. Cần quyền: ' +
          requiredPermissions.join(', '),
      );
    }

    return true;
  }
}
