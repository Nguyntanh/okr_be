import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      permission: {
        findMany: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn(),
      },
    } as unknown as PrismaService;

    service = new PermissionsService(prisma);
  });

  describe('findAllGroupedByModule', () => {
    it('nên gom nhóm các quyền theo trường module', async () => {
      const mockPermissions = [
        {
          id: BigInt(1),
          code: 'user:create',
          module: 'users',
          action: 'create',
          subject: 'User',
        },
        {
          id: BigInt(2),
          code: 'user:read',
          module: 'users',
          action: 'read',
          subject: 'User',
        },
        {
          id: BigInt(3),
          code: 'role:create',
          module: 'roles',
          action: 'create',
          subject: 'Role',
        },
      ];
      (prisma.permission.findMany as jest.Mock).mockResolvedValue(
        mockPermissions,
      );

      const result = await service.findAllGroupedByModule();
      expect(result).toHaveLength(2);
      expect(result[0].module).toBe('users');
      expect(result[0].permissions).toHaveLength(2);
      expect(result[1].module).toBe('roles');
      expect(result[1].permissions).toHaveLength(1);
    });
  });

  describe('getPermissionMatrix', () => {
    it('nên trả về đầy đủ Roles, Modules và Matrix mapping', async () => {
      (prisma.role.findMany as jest.Mock).mockResolvedValue([
        { id: BigInt(1), code: 'SUPER_ADMIN', name: 'Admin', isSystem: true },
      ]);
      (prisma.permission.findMany as jest.Mock).mockResolvedValue([
        { id: BigInt(10), code: 'objective:create', module: 'objectives' },
      ]);
      (prisma.rolePermission.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: BigInt(1),
          permissionId: BigInt(10),
          permission: { id: BigInt(10), code: 'objective:create' },
        },
      ]);

      const result = await service.getPermissionMatrix();
      expect(result).toHaveProperty('roles');
      expect(result).toHaveProperty('modules');
      expect(result).toHaveProperty('matrix');
      expect(result.matrix['1'].permissionCodes).toContain('objective:create');
    });
  });
});
