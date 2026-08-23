import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách tất cả các vai trò kèm số lượng người dùng và số quyền được gán.
   */
  async findAll() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { id: 'asc' }],
    });
  }

  /**
   * Lấy chi tiết một vai trò theo ID kèm danh sách permissions chi tiết.
   */
  async findOne(id: string | bigint) {
    const roleId = typeof id === 'bigint' ? id : BigInt(id);

    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        deletedAt: null,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID ${id}`);
    }

    return role;
  }

  /**
   * Tạo một vai trò tùy chỉnh mới.
   */
  async create(dto: CreateRoleDto) {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.role.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(
        `Mã vai trò "${code}" đã tồn tại trên hệ thống`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          code,
          name: dto.name,
          description: dto.description,
          isSystem: false,
        },
      });

      if (dto.permissionIds && dto.permissionIds.length > 0) {
        const permissionIds = dto.permissionIds.map((pId) => BigInt(pId));
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return role;
    });
  }

  /**
   * Cập nhật thông tin cơ bản của vai trò (tên, mô tả).
   */
  async update(id: string | bigint, dto: UpdateRoleDto) {
    const roleId = typeof id === 'bigint' ? id : BigInt(id);

    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID ${id}`);
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: dto.name ?? role.name,
        description: dto.description ?? role.description,
      },
    });
  }

  /**
   * Xóa vai trò (chỉ cho phép xóa vai trò tùy chỉnh, cấm xóa vai trò hệ thống).
   */
  async remove(id: string | bigint) {
    const roleId = typeof id === 'bigint' ? id : BigInt(id);

    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID ${id}`);
    }

    if (role.isSystem) {
      throw new BadRequestException(
        'Không thể xóa vai trò hệ thống mặc định (System Role)',
      );
    }

    // Soft delete để bảo toàn audit log và lịch sử phân quyền
    await this.prisma.role.update({
      where: { id: roleId },
      data: { deletedAt: new Date() },
    });

    return { message: `Đã xóa thành công vai trò "${role.name}"` };
  }

  /**
   * Lấy danh sách quyền hiện tại của vai trò (dùng cho form chỉnh sửa checkbox).
   */
  async getRolePermissions(id: string | bigint) {
    const roleId = typeof id === 'bigint' ? id : BigInt(id);

    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID ${id}`);
    }

    const permissionIds = role.permissions.map((rp) =>
      rp.permissionId.toString(),
    );
    const permissionCodes = role.permissions
      .map((rp) => rp.permission?.code)
      .filter(Boolean) as string[];

    return {
      roleId: role.id.toString(),
      roleCode: role.code,
      roleName: role.name,
      permissionIds,
      permissionCodes,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  /**
   * Cập nhật toàn bộ ma trận quyền của một Role từ Bảng phân quyền.
   */
  async updateRolePermissions(
    id: string | bigint,
    dto: UpdateRolePermissionsDto,
  ) {
    const roleId = typeof id === 'bigint' ? id : BigInt(id);

    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID ${id}`);
    }

    let targetPermissionIds: bigint[] = [];

    // Nếu truyền danh sách permission IDs
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      targetPermissionIds = dto.permissionIds.map((pId) => BigInt(pId));
    }
    // Nếu truyền danh sách permission Codes
    else if (dto.permissionCodes && dto.permissionCodes.length > 0) {
      const foundPermissions = await this.prisma.permission.findMany({
        where: {
          code: {
            in: dto.permissionCodes,
          },
        },
      });
      targetPermissionIds = foundPermissions.map((p) => p.id);
    }

    // Thực hiện trong transaction: Xóa mapping cũ và tạo mapping mới
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      if (targetPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: targetPermissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.getRolePermissions(roleId);
  }
}
