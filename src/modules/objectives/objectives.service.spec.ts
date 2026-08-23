import { BadRequestException } from '@nestjs/common';
import {
  calculateWeightedProgress,
  ObjectivesService,
} from './objectives.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectiveLevel, Status } from '../../generated/prisma/client';

describe('ObjectivesService & Weighted Progress Algorithm', () => {
  let service: ObjectivesService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      objective: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cycle: {
        findFirst: jest.fn(),
      },
      keyResult: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    } as unknown as PrismaService;

    service = new ObjectivesService(prisma);
  });

  describe('calculateWeightedProgress', () => {
    it('nên trả về 0 nếu không có Key Results', () => {
      expect(calculateWeightedProgress([])).toBe(0);
    });

    it('nên tính chính xác tiến độ có trọng số (Weighted Average)', () => {
      // KR 1: 0 -> 100, đạt 50 (50%), trọng số 1.0
      // KR 2: 0 -> 200, đạt 200 (100%), trọng số 3.0
      // Tổng weight = 4.0
      // Weighted Progress = (50*1 + 100*3) / 4 = 350 / 4 = 87.5%
      const keyResults = [
        { startValue: 0, targetValue: 100, currentValue: 50, weight: 1.0 },
        { startValue: 0, targetValue: 200, currentValue: 200, weight: 3.0 },
      ];

      const result = calculateWeightedProgress(keyResults);
      expect(result).toBe(87.5);
    });

    it('nên giới hạn tiến độ trong khoảng [0, 100]%', () => {
      const keyResults = [
        { startValue: 0, targetValue: 100, currentValue: 150, weight: 1.0 }, // vượt 100% -> clamp 100%
        { startValue: 100, targetValue: 50, currentValue: 120, weight: 1.0 }, // âm -> clamp 0%
      ];

      const result = calculateWeightedProgress(keyResults);
      // (100*1 + 0*1) / 2 = 50%
      expect(result).toBe(50);
    });
  });

  describe('create', () => {
    it('nên chặn tạo Mục tiêu nếu chu kỳ đã bị KHÓA (CLOSED)', async () => {
      (prisma.cycle.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        title: '2025-Q4',
        status: Status.CLOSED,
      });

      await expect(
        service.create('1', {
          title: 'Mục tiêu trong chu kỳ đóng',
          level: ObjectiveLevel.INDIVIDUAL,
          cycleId: '1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
