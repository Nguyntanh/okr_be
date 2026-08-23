import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let prisma: PrismaService;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      userRole: {
        findMany: jest.fn(),
      },
    } as unknown as PrismaService;
    guard = new PermissionsGuard(reflector, prisma);
  });

  const createMockContext = (user: any) => {
    const request = { user };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  };

  it('nên cho phép truy cập nếu endpoint không yêu cầu quyền (@RequirePermissions không khai báo)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    const context = createMockContext({ sub: '1', email: 'test@example.com' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('nên ném lỗi UnauthorizedException nếu chưa xác thực người dùng', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['objective:create']);

    const context = createMockContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('nên tự động cho phép toàn quyền nếu vai trò là SUPER_ADMIN', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['objective:create', 'user:delete']);

    const context = createMockContext({ sub: '1', email: 'admin@example.com' });

    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
      {
        role: {
          code: 'SUPER_ADMIN',
          permissions: [],
        },
      },
    ]);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('nên cho phép nếu người dùng có đầy đủ các quyền yêu cầu', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['objective:create', 'objective:read']);

    const context = createMockContext({
      sub: '2',
      email: 'manager@example.com',
    });

    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
      {
        role: {
          code: 'MANAGER',
          permissions: [
            { permission: { code: 'objective:create' } },
            { permission: { code: 'objective:read' } },
          ],
        },
      },
    ]);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('nên ném ForbiddenException nếu người dùng thiếu quyền', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['objective:create', 'role:delete']);

    const context = createMockContext({ sub: '3', email: 'emp@example.com' });

    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
      {
        role: {
          code: 'EMPLOYEE',
          permissions: [{ permission: { code: 'objective:create' } }],
        },
      },
    ]);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
