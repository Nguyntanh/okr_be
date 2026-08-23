import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectivesService } from '../objectives/objectives.service';
import { CreateCheckInDto } from './dto/create-checkin.dto';
import { ReviewCheckInDto } from './dto/review-checkin.dto';
import { ConfidenceScore, Prisma, Status } from '../../generated/prisma/client';

@Injectable()
export class CheckInsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectivesService: ObjectivesService,
  ) {}

  /**
   * Tạo bản Check-in mới cho một Key Result.
   */
  async create(
    krId: string | bigint,
    userId: string | bigint,
    dto: CreateCheckInDto,
  ) {
    const keyResultId = typeof krId === 'bigint' ? krId : BigInt(krId);
    const creatorId = typeof userId === 'bigint' ? userId : BigInt(userId);

    const keyResult = await this.prisma.keyResult.findFirst({
      where: { id: keyResultId, deletedAt: null },
      include: {
        objective: {
          include: { cycle: true },
        },
      },
    });

    if (!keyResult) {
      throw new NotFoundException(`Không tìm thấy Key Result với ID ${krId}`);
    }

    if (keyResult.objective.cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Chu kỳ OKR đã bị KHÓA (CLOSED), không thể thực hiện Check-in tiến độ mới',
      );
    }

    const oldValue = keyResult.currentValue;
    const newValue = new Prisma.Decimal(dto.newValue);
    const confidenceScore = dto.confidenceScore ?? ConfidenceScore.MEDIUM;

    // Xác định reviewer: Mặc định là approver của Objective, nếu không có thì là Owner của Objective
    const reviewerId =
      keyResult.objective.approverId ??
      (keyResult.objective.ownerId !== creatorId
        ? keyResult.objective.ownerId
        : null);

    // Nếu người check-in chính là Approver hoặc tự quản lý, tự động duyệt
    const isAutoApprove = !reviewerId || reviewerId === creatorId;
    const initialStatus = isAutoApprove ? Status.APPROVED : Status.PENDING;

    const checkIn = await this.prisma.$transaction(async (tx) => {
      const createdCheckIn = await tx.checkIn.create({
        data: {
          krId: keyResultId,
          createdBy: creatorId,
          oldValue,
          newValue,
          confidenceScore,
          note: dto.note,
          blocker: dto.blocker,
          status: initialStatus,
          reviewerId: reviewerId ?? creatorId,
          approvedDoneAt: isAutoApprove ? new Date() : null,
        },
        include: {
          creator: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
          reviewer: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // Nếu được tự động duyệt, cập nhật ngay giá trị của KR
      if (isAutoApprove) {
        await tx.keyResult.update({
          where: { id: keyResultId },
          data: { currentValue: newValue },
        });
      }

      return createdCheckIn;
    });

    // Nếu tự động duyệt, cập nhật lại tiến độ tổng của Objective
    if (isAutoApprove) {
      await this.objectivesService.recalculateProgress(keyResult.objectiveId);
    }

    return checkIn;
  }

  /**
   * Xem lịch sử Check-in (Audit Log) của một Key Result theo thời gian mới nhất.
   */
  async getHistoryByKeyResult(krId: string | bigint) {
    const keyResultId = typeof krId === 'bigint' ? krId : BigInt(krId);

    return this.prisma.checkIn.findMany({
      where: { krId: keyResultId },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy danh sách các yêu cầu Check-in đang chờ Quản lý phê duyệt (PENDING).
   */
  async getPendingReviews(reviewerId: string | bigint) {
    const rId =
      typeof reviewerId === 'bigint' ? reviewerId : BigInt(reviewerId);

    return this.prisma.checkIn.findMany({
      where: {
        status: Status.PENDING,
        OR: [
          { reviewerId: rId },
          { keyResult: { objective: { approverId: rId } } },
          { keyResult: { objective: { ownerId: rId } } },
        ],
      },
      include: {
        keyResult: {
          select: {
            id: true,
            title: true,
            unitType: true,
            unitLabel: true,
            targetValue: true,
            currentValue: true,
            objective: {
              select: {
                id: true,
                title: true,
                level: true,
                progressPercentage: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Quản lý phê duyệt (APPROVED) hoặc từ chối (REJECTED) bản Check-in kèm phản hồi.
   */
  async review(
    checkInId: string | bigint,
    reviewerId: string | bigint,
    dto: ReviewCheckInDto,
  ) {
    const cId = typeof checkInId === 'bigint' ? checkInId : BigInt(checkInId);
    const rId =
      typeof reviewerId === 'bigint' ? reviewerId : BigInt(reviewerId);

    const checkIn = await this.prisma.checkIn.findFirst({
      where: { id: cId },
      include: {
        keyResult: {
          include: {
            objective: { include: { cycle: true } },
          },
        },
      },
    });

    if (!checkIn) {
      throw new NotFoundException(
        `Không tìm thấy bản Check-in với ID ${checkInId}`,
      );
    }

    if (checkIn.keyResult.objective.cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Chu kỳ OKR đã bị KHÓA (CLOSED), không thể duyệt bản Check-in này',
      );
    }

    const updatedCheckIn = await this.prisma.$transaction(async (tx) => {
      const result = await tx.checkIn.update({
        where: { id: cId },
        data: {
          status: dto.status,
          reviewerFeedback: dto.reviewerFeedback,
          reviewerId: rId,
          approvedDoneAt: new Date(),
        },
        include: {
          creator: {
            select: { id: true, fullName: true, email: true },
          },
          reviewer: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // Nếu phê duyệt thành công, chính thức cập nhật giá trị mới lên Key Result
      if (dto.status === Status.APPROVED) {
        await tx.keyResult.update({
          where: { id: checkIn.krId },
          data: { currentValue: checkIn.newValue },
        });
      }

      return result;
    });

    // Cập nhật lại tiến độ tổng của Objective nếu được duyệt
    if (dto.status === Status.APPROVED) {
      await this.objectivesService.recalculateProgress(
        checkIn.keyResult.objectiveId,
      );
    }

    return updatedCheckIn;
  }
}
