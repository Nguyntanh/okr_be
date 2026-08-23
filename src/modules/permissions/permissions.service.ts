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
   * Lấy dữ liệu ma trận tổng hợp toàn bộ Roles x Permissions kèm danh sách người dùng được gán từng vai trò.
   */
  async getPermissionMatrix() {
    const [roles, groupedModules, rolePermissions] = await Promise.all([
      this.prisma.role.findMany({
        where: { deletedAt: null },
        include: {
          users: {
            where: {
              user: { deletedAt: null },
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  fullName: true,
                  jobTitle: true,
                  avatarUrl: true,
                  department: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ isSystem: 'desc' }, { id: 'asc' }],
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

    const formattedRoles = roles.map((role) => {
      const roleIdStr = role.id.toString();
      matrix[roleIdStr] = {
        roleId: roleIdStr,
        roleCode: role.code,
        permissionIds: [],
        permissionCodes: [],
      };

      return {
        id: roleIdStr,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        userCount: role.users.length,
        users: role.users.map((ur) => ({
          id: ur.user.id.toString(),
          email: ur.user.email,
          fullName: ur.user.fullName,
          jobTitle: ur.user.jobTitle,
          avatarUrl: ur.user.avatarUrl,
          department: ur.user.department
            ? {
                id: ur.user.department.id.toString(),
                name: ur.user.department.name,
              }
            : null,
        })),
      };
    });

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
      roles: formattedRoles,
      modules: groupedModules,
      matrix,
    };
  }

  /**
   * Lấy Bảng ma trận Phân quyền theo Từng Người dùng (Users x Roles & Effective Permissions).
   */
  async getUsersPermissionMatrix() {
    const [users, roles, allPermissions] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          roles: {
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
          },
        },
        orderBy: [{ departmentId: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: [{ isSystem: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const formattedUsers = users.map((user) => {
      const assignedRoles = user.roles.map((ur) => ({
        id: ur.role.id.toString(),
        code: ur.role.code,
        name: ur.role.name,
        isSystem: ur.role.isSystem,
      }));

      const roleCodes = assignedRoles.map((r) => r.code);
      const isSuperAdmin = roleCodes.includes('SUPER_ADMIN');

      // Tập hợp quyền thực tế (Effective Permissions)
      let effectivePermissionCodes: string[] = [];
      if (isSuperAdmin) {
        effectivePermissionCodes = allPermissions.map((p) => p.code);
      } else {
        const permSet = new Set<string>();
        for (const ur of user.roles) {
          for (const rp of ur.role.permissions) {
            if (rp.permission?.code) {
              permSet.add(rp.permission.code);
            }
          }
        }
        effectivePermissionCodes = Array.from(permSet);
      }

      return {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        jobTitle: user.jobTitle,
        avatarUrl: user.avatarUrl,
        department: user.department
          ? {
              id: user.department.id.toString(),
              name: user.department.name,
            }
          : null,
        roles: assignedRoles,
        roleCodes,
        isSuperAdmin,
        totalEffectivePermissions: effectivePermissionCodes.length,
        effectivePermissions: effectivePermissionCodes,
      };
    });

    return {
      totalUsers: formattedUsers.length,
      roles: roles.map((r) => ({
        id: r.id.toString(),
        code: r.code,
        name: r.name,
        isSystem: r.isSystem,
      })),
      users: formattedUsers,
    };
  }
}
