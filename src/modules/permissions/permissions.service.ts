import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Bản đồ tên hiển thị thân thiện cho từng module
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  users: 'Quản lý người dùng',
  roles: 'Quản lý vai trò & Phân quyền',
  departments: 'Quản lý phòng ban',
  cycles: 'Quản lý chu kỳ OKR',
  objectives: 'Quản lý Mục tiêu (Objectives)',
  key_results: 'Quản lý Kết quả then chốt (Key Results)',
  alignments: 'Quản lý Gióng hàng OKR (Alignments)',
  checkins: 'Quản lý Check-in & Tiến độ',
  reports: 'Báo cáo & Dashboard',
  system: 'Hệ thống',
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách tất cả các quyền trong hệ thống.
   */
  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Lấy danh sách quyền được gom nhóm theo từng Module (phù hợp cho UI Bảng phân quyền).
   */
  async findAllGroupedByModule() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { id: 'asc' }],
    });

    const groupedMap = new Map<
      string,
      {
        module: string;
        moduleName: string;
        permissions: typeof permissions;
      }
    >();

    for (const perm of permissions) {
      const moduleKey = perm.module || 'system';
      if (!groupedMap.has(moduleKey)) {
        groupedMap.set(moduleKey, {
          module: moduleKey,
          moduleName:
            MODULE_DISPLAY_NAMES[moduleKey] || moduleKey.toUpperCase(),
          permissions: [],
        });
      }
      groupedMap.get(moduleKey)!.permissions.push(perm);
    }

    return Array.from(groupedMap.values());
  }

  /**
   * Lấy dữ liệu ma trận tổng hợp toàn bộ Roles x Permissions để Frontend vẽ trọn vẹn Bảng phân quyền.
   */
  async getPermissionMatrix() {
    const [roles, groupedModules, rolePermissions] = await Promise.all([
      this.prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: { id: 'asc' },
      }),
      this.findAllGroupedByModule(),
      this.prisma.rolePermission.findMany({
        include: {
          permission: true,
        },
      }),
    ]);

    // Xây dựng mapping roleId -> array of permission codes / ids
    const matrix: Record<
      string,
      {
        roleId: string;
        roleCode: string;
        permissionIds: string[];
        permissionCodes: string[];
      }
    > = {};

    for (const role of roles) {
      const roleIdStr = role.id.toString();
      matrix[roleIdStr] = {
        roleId: roleIdStr,
        roleCode: role.code,
        permissionIds: [],
        permissionCodes: [],
      };
    }

    for (const rp of rolePermissions) {
      const roleIdStr = rp.roleId.toString();
      if (matrix[roleIdStr]) {
        matrix[roleIdStr].permissionIds.push(rp.permissionId.toString());
        if (rp.permission?.code) {
          matrix[roleIdStr].permissionCodes.push(rp.permission.code);
        }
      }
    }

    return {
      roles,
      modules: groupedModules,
      matrix,
    };
  }
}
