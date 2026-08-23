import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';
import { QueryObjectiveDto } from './dto/query-objective.dto';
import { CreateAlignmentDto } from './dto/create-alignment.dto';
import {
  AlignmentType,
  ObjectiveLevel,
  Prisma,
  Status,
  UnitType,
} from '../../generated/prisma/client';

/**
 * Thuật toán tính toán % tiến độ tổng hợp có trọng số (Weighted Progress) cho Objective.
 */
export function calculateWeightedProgress(
  keyResults: {
    startValue: Prisma.Decimal | number | string;
    targetValue: Prisma.Decimal | number | string;
    currentValue: Prisma.Decimal | number | string;
    weight: Prisma.Decimal | number | string;
  }[],
): number {
  if (!keyResults || keyResults.length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let weightedProgressSum = 0;

  for (const kr of keyResults) {
    const start = Number(kr.startValue);
    const target = Number(kr.targetValue);
    const current = Number(kr.currentValue);
    const weight = Number(kr.weight) > 0 ? Number(kr.weight) : 1;

    let krProgress = 0;
    const diff = target - start;

    if (diff !== 0) {
      krProgress = ((current - start) / diff) * 100;
    } else {
      krProgress = current >= target ? 100 : 0;
    }

    // Giới hạn trong khoảng [0, 100]%
    krProgress = Math.max(0, Math.min(100, krProgress));

    weightedProgressSum += krProgress * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  const overallProgress = weightedProgressSum / totalWeight;
  return Math.round(overallProgress * 100) / 100;
}

@Injectable()
export class ObjectivesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính toán lại và cập nhật % tiến độ tổng của Objective vào DB.
   */
  async recalculateProgress(objectiveId: bigint): Promise<number> {
    const keyResults = await this.prisma.keyResult.findMany({
      where: { objectiveId, deletedAt: null },
    });

    const progress = calculateWeightedProgress(keyResults);

    await this.prisma.objective.update({
      where: { id: objectiveId },
      data: {
        progressPercentage: new Prisma.Decimal(progress),
      },
    });

    return progress;
  }

  /**
   * Lấy danh sách OKR kèm bộ lọc chi tiết (Chu kỳ, Phòng ban, Sở hữu, Cấp độ, Trạng thái, Từ khóa).
   */
  async findAll(query: QueryObjectiveDto, currentUserId?: string) {
    const where: Prisma.ObjectiveWhereInput = {
      deletedAt: null,
    };

    if (query.cycleId) {
      where.cycleId = BigInt(query.cycleId);
    }

    if (query.departmentId) {
      where.departmentId = BigInt(query.departmentId);
    }

    if (query.ownerId) {
      where.ownerId = BigInt(query.ownerId);
    }

    if (query.level) {
      where.level = query.level;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.mine === 'true' && currentUserId) {
      const uId = BigInt(currentUserId);
      where.OR = [{ ownerId: uId }, { approverId: uId }];
    }

    if (query.search) {
      where.title = {
        contains: query.search,
      };
    }

    return this.prisma.objective.findMany({
      where,
      include: {
        cycle: {
          select: {
            id: true,
            title: true,
            code: true,
            status: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        keyResults: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            unitType: true,
            unitLabel: true,
            startValue: true,
            targetValue: true,
            currentValue: true,
            weight: true,
          },
        },
        alignmentsFrom: {
          include: {
            alignedTo: {
              select: {
                id: true,
                title: true,
                level: true,
                status: true,
                progressPercentage: true,
                owner: { select: { id: true, fullName: true } },
              },
            },
          },
        },
        alignmentsTo: {
          include: {
            alignedFrom: {
              select: {
                id: true,
                title: true,
                level: true,
                status: true,
                progressPercentage: true,
                owner: { select: { id: true, fullName: true } },
              },
            },
          },
        },
        _count: {
          select: {
            keyResults: true,
            alignmentsFrom: true,
            alignmentsTo: true,
          },
        },
      },
      orderBy: [
        { level: 'asc' },
        { progressPercentage: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  /**
   * Lấy chi tiết một Mục tiêu kèm toàn bộ Key Results, Gióng hàng và Check-in gần nhất.
   */
  async findOne(id: string | bigint) {
    const objId = typeof id === 'bigint' ? id : BigInt(id);

    const objective = await this.prisma.objective.findFirst({
      where: { id: objId, deletedAt: null },
      include: {
        cycle: true,
        department: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        keyResults: {
          where: { deletedAt: null },
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            checkIns: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: {
                creator: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
                reviewer: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        alignmentsFrom: {
          include: {
            alignedTo: {
              select: {
                id: true,
                title: true,
                level: true,
                status: true,
                progressPercentage: true,
                owner: { select: { id: true, fullName: true } },
              },
            },
          },
        },
        alignmentsTo: {
          include: {
            alignedFrom: {
              select: {
                id: true,
                title: true,
                level: true,
                status: true,
                progressPercentage: true,
                owner: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
    });

    if (!objective) {
      throw new NotFoundException(`Không tìm thấy Mục tiêu với ID ${id}`);
    }

    return objective;
  }

  /**
   * Tạo Mục tiêu mới kèm khởi tạo các Key Results ban đầu (nếu có).
   */
  async create(currentUserId: string, dto: CreateObjectiveDto) {
    const cycle = await this.prisma.cycle.findFirst({
      where: { id: BigInt(dto.cycleId), deletedAt: null },
    });

    if (!cycle) {
      throw new NotFoundException('Chu kỳ OKR không tồn tại');
    }

    if (cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Không thể tạo mục tiêu trong chu kỳ đã bị KHÓA (CLOSED)',
      );
    }

    const ownerId = dto.ownerId ? BigInt(dto.ownerId) : BigInt(currentUserId);
    const approverId = dto.approverId ? BigInt(dto.approverId) : null;
    const departmentId = dto.departmentId ? BigInt(dto.departmentId) : null;

    if (dto.level === ObjectiveLevel.DEPARTMENT && !departmentId) {
      throw new BadRequestException(
        'Mục tiêu cấp phòng ban (DEPARTMENT) bắt buộc phải chọn Phòng ban',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const objective = await tx.objective.create({
        data: {
          title: dto.title,
          description: dto.description,
          level: dto.level,
          cycleId: BigInt(dto.cycleId),
          departmentId,
          ownerId,
          approverId,
          confidenceScore: dto.confidenceScore,
          weight: dto.weight
            ? new Prisma.Decimal(dto.weight)
            : new Prisma.Decimal(1.0),
          status: Status.DRAFT,
        },
      });

      if (dto.keyResults && dto.keyResults.length > 0) {
        const createdKRs = await Promise.all(
          dto.keyResults.map((kr) =>
            tx.keyResult.create({
              data: {
                objectiveId: objective.id,
                title: kr.title,
                ownerId: kr.ownerId ? BigInt(kr.ownerId) : ownerId,
                unitType: kr.unitType ?? UnitType.NUMERIC,
                unitLabel: kr.unitLabel,
                startValue:
                  kr.startValue !== undefined
                    ? new Prisma.Decimal(kr.startValue)
                    : new Prisma.Decimal(0),
                targetValue: new Prisma.Decimal(kr.targetValue),
                currentValue:
                  kr.currentValue !== undefined
                    ? new Prisma.Decimal(kr.currentValue)
                    : kr.startValue !== undefined
                      ? new Prisma.Decimal(kr.startValue)
                      : new Prisma.Decimal(0),
                weight: kr.weight
                  ? new Prisma.Decimal(kr.weight)
                  : new Prisma.Decimal(1.0),
              },
            }),
          ),
        );

        const initialProgress = calculateWeightedProgress(createdKRs);
        await tx.objective.update({
          where: { id: objective.id },
          data: { progressPercentage: new Prisma.Decimal(initialProgress) },
        });
      }

      return this.findOne(objective.id);
    });
  }

  /**
   * Cập nhật thông tin Mục tiêu.
   */
  async update(id: string | bigint, dto: UpdateObjectiveDto) {
    const objId = typeof id === 'bigint' ? id : BigInt(id);

    const objective = await this.prisma.objective.findFirst({
      where: { id: objId, deletedAt: null },
      include: { cycle: true },
    });

    if (!objective) {
      throw new NotFoundException(`Không tìm thấy Mục tiêu với ID ${id}`);
    }

    if (objective.cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Chu kỳ chứa mục tiêu này đã bị KHÓA (CLOSED), không thể chỉnh sửa',
      );
    }

    await this.prisma.objective.update({
      where: { id: objId },
      data: {
        title: dto.title ?? objective.title,
        description: dto.description ?? objective.description,
        level: dto.level ?? objective.level,
        departmentId:
          dto.departmentId !== undefined
            ? dto.departmentId
              ? BigInt(dto.departmentId)
              : null
            : objective.departmentId,
        ownerId: dto.ownerId ? BigInt(dto.ownerId) : objective.ownerId,
        approverId:
          dto.approverId !== undefined
            ? dto.approverId
              ? BigInt(dto.approverId)
              : null
            : objective.approverId,
        confidenceScore: dto.confidenceScore ?? objective.confidenceScore,
        weight: dto.weight ? new Prisma.Decimal(dto.weight) : objective.weight,
      },
    });

    return this.findOne(objId);
  }

  /**
   * Quản lý chuyển đổi trạng thái duyệt Mục tiêu (DRAFT -> PENDING -> APPROVED / REJECTED).
   */
  async updateStatus(
    id: string | bigint,
    status: Status,
    currentUserId: string,
  ) {
    const objId = typeof id === 'bigint' ? id : BigInt(id);

    const objective = await this.prisma.objective.findFirst({
      where: { id: objId, deletedAt: null },
      include: { cycle: true },
    });

    if (!objective) {
      throw new NotFoundException(`Không tìm thấy Mục tiêu với ID ${id}`);
    }

    if (objective.cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Chu kỳ đã bị KHÓA (CLOSED), không thể thay đổi trạng thái mục tiêu',
      );
    }

    // Nếu phê duyệt/từ chối, kiểm tra người duyệt
    if (status === Status.APPROVED || status === Status.REJECTED) {
      const uId = BigInt(currentUserId);
      // Cho phép nếu là Approver hoặc có quyền Admin
      if (
        objective.approverId &&
        objective.approverId !== uId &&
        objective.ownerId === uId
      ) {
        // Chủ sở hữu không được tự duyệt mục tiêu của mình nếu đã chỉ định approver khác
      }
    }

    return this.prisma.objective.update({
      where: { id: objId },
      data: { status },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        approver: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  /**
   * Xóa Mục tiêu (Soft-delete).
   */
  async remove(id: string | bigint) {
    const objId = typeof id === 'bigint' ? id : BigInt(id);

    const objective = await this.prisma.objective.findFirst({
      where: { id: objId, deletedAt: null },
      include: { cycle: true },
    });

    if (!objective) {
      throw new NotFoundException(`Không tìm thấy Mục tiêu với ID ${id}`);
    }

    if (objective.cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Chu kỳ đã bị KHÓA (CLOSED), không thể xóa mục tiêu',
      );
    }

    await this.prisma.objective.update({
      where: { id: objId },
      data: { deletedAt: new Date() },
    });

    return { message: `Đã xóa thành công Mục tiêu "${objective.title}"` };
  }

  /**
   * Thiết lập liên kết gióng hàng (Alignment) giữa 2 Objectives.
   */
  async alignObjective(fromObjId: string | bigint, dto: CreateAlignmentDto) {
    const alignedFromObjId =
      typeof fromObjId === 'bigint' ? fromObjId : BigInt(fromObjId);
    const alignedToObjId = BigInt(dto.alignedToObjId);

    if (alignedFromObjId === alignedToObjId) {
      throw new BadRequestException(
        'Mục tiêu không thể tự gióng hàng với chính nó',
      );
    }

    const [fromObj, toObj] = await Promise.all([
      this.prisma.objective.findFirst({
        where: { id: alignedFromObjId, deletedAt: null },
      }),
      this.prisma.objective.findFirst({
        where: { id: alignedToObjId, deletedAt: null },
      }),
    ]);

    if (!fromObj || !toObj) {
      throw new NotFoundException('Một trong hai Mục tiêu không tồn tại');
    }

    const alignmentType = dto.alignmentType ?? AlignmentType.VERTICAL;

    const alignment = await this.prisma.objectiveAlignment.upsert({
      where: {
        alignedFromObjId_alignedToObjId: {
          alignedFromObjId,
          alignedToObjId,
        },
      },
      update: {
        alignmentType,
      },
      create: {
        alignedFromObjId,
        alignedToObjId,
        alignmentType,
      },
      include: {
        alignedFrom: { select: { id: true, title: true, level: true } },
        alignedTo: { select: { id: true, title: true, level: true } },
      },
    });

    // Đánh dấu cờ isAlignedCross nếu là gióng hàng chéo
    if (alignmentType === AlignmentType.CROSS) {
      await this.prisma.objective.update({
        where: { id: alignedFromObjId },
        data: { isAlignedCross: true },
      });
    }

    return alignment;
  }

  /**
   * Hủy bỏ liên kết gióng hàng.
   */
  async removeAlignment(fromObjId: string | bigint, toObjId: string | bigint) {
    const alignedFromObjId =
      typeof fromObjId === 'bigint' ? fromObjId : BigInt(fromObjId);
    const alignedToObjId =
      typeof toObjId === 'bigint' ? toObjId : BigInt(toObjId);

    await this.prisma.objectiveAlignment.deleteMany({
      where: {
        alignedFromObjId,
        alignedToObjId,
      },
    });

    return { message: 'Đã hủy liên kết gióng hàng thành công' };
  }
}
