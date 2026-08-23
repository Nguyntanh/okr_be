import { BadRequestException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      department: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    service = new DepartmentsService(prisma);
  });

  describe('getTree', () => {
    it('nên xây dựng đúng cấu trúc cây phân cấp phòng ban cha - con', async () => {
      const mockDepartments = [
        { id: BigInt(1), name: 'Ban Giám đốc', parentId: null },
        { id: BigInt(2), name: 'Khối Công nghệ', parentId: BigInt(1) },
        {
          id: BigInt(3),
          name: 'Phòng Phát triển Phần mềm',
          parentId: BigInt(2),
        },
      ];
      (prisma.department.findMany as jest.Mock).mockResolvedValue(
        mockDepartments,
      );

      const tree = await service.getTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id.toString()).toBe('1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id.toString()).toBe('2');
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].id.toString()).toBe('3');
    });
  });

  describe('update', () => {
    it('nên ném BadRequestException nếu chọn chính mình làm phòng ban cha', async () => {
      (prisma.department.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(5),
        name: 'Phòng Kế toán',
      });

      await expect(service.update('5', { parentId: '5' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('nên chặn xóa nếu phòng ban vẫn còn phòng ban con trực thuộc', async () => {
      (prisma.department.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        name: 'Khối Kỹ thuật',
        children: [{ id: BigInt(2), name: 'Phòng Backend' }],
        members: [],
      });

      await expect(service.remove('1')).rejects.toThrow(BadRequestException);
    });
  });
});
