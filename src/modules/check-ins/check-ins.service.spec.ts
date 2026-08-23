import { BadRequestException } from '@nestjs/common';
import { CheckInsService } from './check-ins.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectivesService } from '../objectives/objectives.service';
import { ConfidenceScore, Status } from '../../generated/prisma/client';

describe('CheckInsService', () => {
  let service: CheckInsService;
  let prisma: PrismaService;
  let objectivesService: ObjectivesService;

  beforeEach(() => {
    prisma = {
      keyResult: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      checkIn: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    } as unknown as PrismaService;

    objectivesService = {
      recalculateProgress: jest.fn(),
    } as unknown as ObjectivesService;

    service = new CheckInsService(prisma, objectivesService);
  });

  describe('create', () => {
    it('nên chặn check-in nếu chu kỳ OKR đã bị KHÓA (CLOSED)', async () => {
      (prisma.keyResult.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        currentValue: 0,
        objective: {
          id: BigInt(10),
          cycle: { status: Status.CLOSED },
        },
      });

      await expect(
        service.create('1', '2', {
          newValue: 50,
          confidenceScore: ConfidenceScore.HIGH,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('review', () => {
    it('khi Quản lý duyệt APPROVED, nên cập nhật currentValue của Key Result và tính lại tiến độ Objective', async () => {
      const mockCheckIn = {
        id: BigInt(5),
        krId: BigInt(1),
        newValue: 80,
        status: Status.PENDING,
        keyResult: {
          id: BigInt(1),
          objectiveId: BigInt(10),
          objective: { cycle: { status: Status.ACTIVE } },
        },
      };

      (prisma.checkIn.findFirst as jest.Mock).mockResolvedValue(mockCheckIn);
      (prisma.checkIn.update as jest.Mock).mockResolvedValue({
        id: BigInt(5),
        status: Status.APPROVED,
      });

      const result = await service.review('5', '1', {
        status: Status.APPROVED,
        reviewerFeedback: 'Làm rất tốt',
      });

      expect(result.status).toBe(Status.APPROVED);
      expect(prisma.keyResult.update).toHaveBeenCalled();
      expect(objectivesService.recalculateProgress).toHaveBeenCalledWith(
        BigInt(10),
      );
    });
  });
});
