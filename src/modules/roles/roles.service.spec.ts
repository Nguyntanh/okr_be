import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      role: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      rolePermission: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    } as unknown as PrismaService;

    service = new RolesService(prisma);
  });

  describe('findAll', () => {
    it('nên trả về danh sách vai trò chưa bị xóa', async () => {
      const mockRoles = [
        {
          id: BigInt(1),
          code: 'SUPER_ADMIN',
          name: 'Quản trị viên',
          isSystem: true,
        },
      ];
      (prisma.role.findMany as jest.Mock).mockResolvedValue(mockRoles);

      const result = await service.findAll();
      expect(result).toEqual(mockRoles);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
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
    });
  });

  describe('findOne', () => {
    it('nên ném NotFoundException nếu không tìm thấy vai trò', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('nên ném ConflictException nếu mã vai trò đã tồn tại', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        code: 'ADMIN',
      });

      await expect(
        service.create({ code: 'ADMIN', name: 'Admin Test' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('nên ném BadRequestException nếu xóa vai trò hệ thống (isSystem: true)', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        code: 'SUPER_ADMIN',
        isSystem: true,
      });

      await expect(service.remove('1')).rejects.toThrow(BadRequestException);
    });

    it('nên cho phép soft-delete nếu là vai trò tùy chỉnh', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(2),
        code: 'CUSTOM_ROLE',
        name: 'Custom',
        isSystem: false,
      });
      (prisma.role.update as jest.Mock).mockResolvedValue({});

      const result = await service.remove('2');
      expect(result).toHaveProperty('message');
      expect(prisma.role.update).toHaveBeenCalled();
    });
  });
});
