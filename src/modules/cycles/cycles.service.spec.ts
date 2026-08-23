import { BadRequestException, ConflictException } from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Status } from '../../generated/prisma/client';

describe('CyclesService', () => {
  let service: CyclesService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      cycle: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    service = new CyclesService(prisma);
  });

  describe('create', () => {
    it('nên ném BadRequestException nếu ngày kết thúc trước ngày bắt đầu', async () => {
      (prisma.cycle.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('1', {
          title: 'Chu kỳ sai ngày',
          code: '2026-INVALID',
          startDate: '2026-06-30',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên ném ConflictException nếu mã chu kỳ đã tồn tại', async () => {
      (prisma.cycle.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        code: '2026-Q1',
      });

      await expect(
        service.create('1', {
          title: 'Chu kỳ Q1',
          code: '2026-Q1',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('nên cho phép khóa (CLOSED) chu kỳ OKR', async () => {
      (prisma.cycle.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        title: '2026-Q1',
        status: Status.ACTIVE,
      });
      (prisma.cycle.update as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        status: Status.CLOSED,
      });

      const result = await service.updateStatus('1', Status.CLOSED);
      expect(result.status).toBe(Status.CLOSED);
      expect(prisma.cycle.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { status: Status.CLOSED },
      });
    });
  });

  describe('remove', () => {
    it('nên chặn xóa chu kỳ nếu đang có Mục tiêu trực thuộc', async () => {
      (prisma.cycle.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        title: '2026-Q1',
        objectives: [{ id: BigInt(10) }],
      });

      await expect(service.remove('1')).rejects.toThrow(BadRequestException);
    });
  });
});
