import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '../../generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm kiếm user theo email (sử dụng trong AuthService).
   */
  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  /**
   * Lấy chi tiết user theo ID kèm Roles, Department, Manager.
   */
  async findById(id: string | bigint) {
    const userId = typeof id === 'bigint' ? id : BigInt(id);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        department: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
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
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Lấy danh sách tất cả người dùng trong hệ thống kèm vai trò và phòng ban.
   */
  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        roles: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                isSystem: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return users.map(({ password, ...user }) => user);
  }

  /**
   * Tạo người dùng mới và gán vai trò ban đầu.
   */
  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`Email "${dto.email}" đã được sử dụng`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          fullName: dto.fullName,
          avatarUrl: dto.avatarUrl,
          jobTitle: dto.jobTitle,
          departmentId: dto.departmentId ? BigInt(dto.departmentId) : null,
          managerId: dto.managerId ? BigInt(dto.managerId) : null,
        },
      });

      if (dto.roleIds && dto.roleIds.length > 0) {
        const roleIds = dto.roleIds.map((rId) => BigInt(rId));
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: user.id,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  /**
   * Cập nhật thông tin người dùng.
   */
  async update(id: string | bigint, dto: UpdateUserDto) {
    const userId = typeof id === 'bigint' ? id : BigInt(id);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName ?? user.fullName,
        avatarUrl: dto.avatarUrl ?? user.avatarUrl,
        jobTitle: dto.jobTitle ?? user.jobTitle,
        departmentId:
          dto.departmentId !== undefined
            ? dto.departmentId
              ? BigInt(dto.departmentId)
              : null
            : user.departmentId,
        managerId:
          dto.managerId !== undefined
            ? dto.managerId
              ? BigInt(dto.managerId)
              : null
            : user.managerId,
        status: dto.status ?? user.status,
      },
    });

    const { password, ...safeUser } = updated;
    return safeUser;
  }

  /**
   * Gán danh sách vai trò cho người dùng (Dynamic Role Assignment).
   */
  async assignRoles(id: string | bigint, dto: AssignUserRolesDto) {
    const userId = typeof id === 'bigint' ? id : BigInt(id);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);
    }

    let targetRoleIds: bigint[] = [];

    if (dto.roleIds && dto.roleIds.length > 0) {
      targetRoleIds = dto.roleIds.map((rId) => BigInt(rId));
    } else if (dto.roleCodes && dto.roleCodes.length > 0) {
      const foundRoles = await this.prisma.role.findMany({
        where: {
          code: { in: dto.roleCodes },
          deletedAt: null,
        },
      });
      targetRoleIds = foundRoles.map((r) => r.id);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId },
      });

      if (targetRoleIds.length > 0) {
        await tx.userRole.createMany({
          data: targetRoleIds.map((roleId) => ({
            userId,
            roleId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.findById(userId);
  }

  /**
   * Lấy toàn bộ danh sách vai trò và quyền hạn duy nhất của một User.
   */
  async getUserPermissions(id: string | bigint) {
    const userId = typeof id === 'bigint' ? id : BigInt(id);

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

    const roles: { id: string; code: string; name: string }[] = [];
    const permissionCodes = new Set<string>();
    let isSuperAdmin = false;

    for (const ur of userRoles) {
      const role = ur.role;
      if (!role) continue;

      roles.push({
        id: role.id.toString(),
        code: role.code,
        name: role.name,
      });

      if (role.code === 'SUPER_ADMIN') {
        isSuperAdmin = true;
      }

      for (const rp of role.permissions) {
        if (rp.permission?.code) {
          permissionCodes.add(rp.permission.code);
        }
      }
    }

    return {
      userId: userId.toString(),
      isSuperAdmin,
      roles,
      permissions: Array.from(permissionCodes),
    };
  }
}
