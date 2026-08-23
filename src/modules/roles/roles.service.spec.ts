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
      userRole: {
        findUnique: jest.fn(),
        delete: jest.fn(),
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

  describe('getRoleUsers', () => {
    it('nên trả về danh sách người dùng được gán vào vai trò', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        code: 'MANAGER',
        name: 'Quản lý',
        users: [
          {
            user: {
              id: BigInt(10),
              email: 'manager@example.com',
              fullName: 'Manager User',
              jobTitle: 'Lead',
              avatarUrl: null,
              department: { id: BigInt(1), name: 'Engineering' },
            },
          },
        ],
      });

      const result = await service.getRoleUsers('1');
      expect(result.roleCode).toBe('MANAGER');
      expect(result.totalUsers).toBe(1);
      expect(result.users[0].email).toBe('manager@example.com');
    });
  });

  describe('assignUsersToRole', () => {
    it('nên gán nhiều người dùng vào vai trò', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        code: 'MANAGER',
        name: 'Quản lý',
        users: [],
      });
      (prisma.userRole.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.assignUsersToRole('1', ['10', '11']);
      expect(prisma.userRole.createMany).toHaveBeenCalled();
      expect(result).toHaveProperty('roleCode');
    });
  });

  describe('removeUserFromRole', () => {
    it('nên thu hồi vai trò khỏi người dùng', async () => {
      (prisma.userRole.findUnique as jest.Mock).mockResolvedValue({
        userId: BigInt(10),
        roleId: BigInt(1),
      });
      (prisma.userRole.delete as jest.Mock).mockResolvedValue({});

      const result = await service.removeUserFromRole('1', '10');
      expect(result.message).toContain('thu hồi vai trò');
      expect(prisma.userRole.delete).toHaveBeenCalled();
    });
  });
});
