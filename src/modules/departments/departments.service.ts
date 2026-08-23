import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách phẳng tất cả phòng ban kèm thông tin quản lý và số lượng thành viên.
   */
  async findAll() {
    return this.prisma.department.findMany({
      where: { deletedAt: null },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            children: true,
            departmentObjectives: true,
          },
        },
      },
      orderBy: [{ parentId: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Lấy toàn bộ cây cơ cấu tổ chức phòng ban cha-con (Organization Tree).
   */
  async getTree() {
    const allDepartments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        _count: {
          select: {
            members: true,
            departmentObjectives: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const deptMap = new Map<string, any>();
    const rootNodes: any[] = [];

    // Khởi tạo các node với mảng children rỗng
    for (const dept of allDepartments) {
      deptMap.set(dept.id.toString(), {
        ...dept,
        children: [],
      });
    }

    // Xây dựng liên kết cây cha-con
    for (const dept of allDepartments) {
      const node = deptMap.get(dept.id.toString());
      if (dept.parentId) {
        const parentNode = deptMap.get(dept.parentId.toString());
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  /**
   * Lấy chi tiết một phòng ban kèm danh sách thành viên và mục tiêu phòng ban.
   */
  async findOne(id: string | bigint) {
    const deptId = typeof id === 'bigint' ? id : BigInt(id);

    const department = await this.prisma.department.findFirst({
      where: { id: deptId, deletedAt: null },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        members: {
          where: { deletedAt: null },
          select: {
            id: true,
            fullName: true,
            email: true,
            jobTitle: true,
            avatarUrl: true,
            status: true,
          },
        },
        _count: {
          select: {
            members: true,
            children: true,
            departmentObjectives: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Không tìm thấy phòng ban với ID ${id}`);
    }

    return department;
  }

  /**
   * Tạo phòng ban mới và gán vị trí trong cây cơ cấu.
   */
  async create(dto: CreateDepartmentDto) {
    if (dto.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: BigInt(dto.parentId), deletedAt: null },
      });
      if (!parent) {
        throw new BadRequestException(
          `Phòng ban cha với ID ${dto.parentId} không tồn tại`,
        );
      }
    }

    if (dto.managerId) {
      const manager = await this.prisma.user.findFirst({
        where: { id: BigInt(dto.managerId), deletedAt: null },
      });
      if (!manager) {
        throw new BadRequestException(
          `Người quản lý với ID ${dto.managerId} không tồn tại`,
        );
      }
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId ? BigInt(dto.parentId) : null,
        managerId: dto.managerId ? BigInt(dto.managerId) : null,
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Cập nhật thông tin phòng ban, chuyển phòng ban cha hoặc đổi Trưởng phòng.
   */
  async update(id: string | bigint, dto: UpdateDepartmentDto) {
    const deptId = typeof id === 'bigint' ? id : BigInt(id);

    const department = await this.prisma.department.findFirst({
      where: { id: deptId, deletedAt: null },
    });

    if (!department) {
      throw new NotFoundException(`Không tìm thấy phòng ban với ID ${id}`);
    }

    // Không cho phép chọn chính mình làm phòng ban cha
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (BigInt(dto.parentId) === deptId) {
        throw new BadRequestException(
          'Một phòng ban không thể tự làm phòng ban cha của chính mình',
        );
      }
    }

    return this.prisma.department.update({
      where: { id: deptId },
      data: {
        name: dto.name ?? department.name,
        description: dto.description ?? department.description,
        parentId:
          dto.parentId !== undefined
            ? dto.parentId
              ? BigInt(dto.parentId)
              : null
            : department.parentId,
        managerId:
          dto.managerId !== undefined
            ? dto.managerId
              ? BigInt(dto.managerId)
              : null
            : department.managerId,
        status: dto.status ?? department.status,
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Xóa phòng ban (Soft-delete).
   */
  async remove(id: string | bigint) {
    const deptId = typeof id === 'bigint' ? id : BigInt(id);

    const department = await this.prisma.department.findFirst({
      where: { id: deptId, deletedAt: null },
      include: {
        children: { where: { deletedAt: null } },
        members: { where: { deletedAt: null } },
      },
    });

    if (!department) {
      throw new NotFoundException(`Không tìm thấy phòng ban với ID ${id}`);
    }

    if (department.children.length > 0) {
      throw new BadRequestException(
        `Không thể xóa phòng ban "${department.name}" vì vẫn còn ${department.children.length} phòng ban con trực thuộc`,
      );
    }

    await this.prisma.department.update({
      where: { id: deptId },
      data: { deletedAt: new Date() },
    });

    return { message: `Đã xóa thành công phòng ban "${department.name}"` };
  }
}
