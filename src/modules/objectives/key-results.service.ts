import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectivesService } from './objectives.service';
import { CreateKeyResultDto } from './dto/create-key-result.dto';
import { UpdateKeyResultDto } from './dto/update-key-result.dto';
import { Prisma, Status, UnitType } from '../../generated/prisma/client';

@Injectable()
export class KeyResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectivesService: ObjectivesService,
  ) {}

  /**
   * Lấy chi tiết một Key Result kèm lịch sử Check-ins.
   */
  async findOne(id: string | bigint) {
    const krId = typeof id === 'bigint' ? id : BigInt(id);

    const keyResult = await this.prisma.keyResult.findFirst({
      where: { id: krId, deletedAt: null },
      include: {
        objective: {
          select: {
            id: true,
            title: true,
            level: true,
            status: true,
            cycleId: true,
            cycle: { select: { id: true, title: true, status: true } },
          },
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        checkIns: {
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: {
                id: true,
                fullName: true,
                email: true,
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
    });

    if (!keyResult) {
      throw new NotFoundException(`Không tìm thấy Key Result với ID ${id}`);
    }

    return keyResult;
  }

  /**
   * Thêm Key Result vào một Objective cụ thể.
   */
  async create(objectiveId: string | bigint, dto: CreateKeyResultDto) {
    const objId =
      typeof objectiveId === 'bigint' ? objectiveId : BigInt(objectiveId);

    const objective = await this.prisma.objective.findFirst({
      where: { id: objId, deletedAt: null },
      include: { cycle: true },
    });

    if (!objective) {
      throw new NotFoundException('Mục tiêu không tồn tại');
    }

    if (objective.cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Chu kỳ đã bị KHÓA (CLOSED), không thể thêm Key Result',
      );
    }

    const ownerId = dto.ownerId ? BigInt(dto.ownerId) : objective.ownerId;
    const startValue =
      dto.startValue !== undefined
        ? new Prisma.Decimal(dto.startValue)
        : new Prisma.Decimal(0);
    const targetValue = new Prisma.Decimal(dto.targetValue);
    const currentValue =
      dto.currentValue !== undefined
        ? new Prisma.Decimal(dto.currentValue)
        : startValue;
    const weight = dto.weight
      ? new Prisma.Decimal(dto.weight)
      : new Prisma.Decimal(1.0);

    const keyResult = await this.prisma.keyResult.create({
      data: {
        objectiveId: objId,
        title: dto.title,
        ownerId,
        unitType: dto.unitType ?? UnitType.NUMERIC,
        unitLabel: dto.unitLabel,
        startValue,
        targetValue,
        currentValue,
        weight,
      },
      include: {
        owner: { select: { id: true, fullName: true } },
      },
    });

    // Tự động tính toán lại % tiến độ của Objective cha
    await this.objectivesService.recalculateProgress(objId);

    return keyResult;
  }

  /**
   * Cập nhật thông tin Key Result (chỉ tiêu, giá trị, trọng số) và tự động tính lại tiến độ Objective.
   */
  async update(id: string | bigint, dto: UpdateKeyResultDto) {
    const krId = typeof id === 'bigint' ? id : BigInt(id);

    const keyResult = await this.prisma.keyResult.findFirst({
      where: { id: krId, deletedAt: null },
      include: {
        objective: {
          include: { cycle: true },
        },
      },
    });

    if (!keyResult) {
      throw new NotFoundException(`Không tìm thấy Key Result với ID ${id}`);
    }

    if (keyResult.objective.cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Chu kỳ đã bị KHÓA (CLOSED), không thể cập nhật Key Result',
      );
    }

    const updated = await this.prisma.keyResult.update({
      where: { id: krId },
      data: {
        title: dto.title ?? keyResult.title,
        ownerId: dto.ownerId ? BigInt(dto.ownerId) : keyResult.ownerId,
        unitType: dto.unitType ?? keyResult.unitType,
        unitLabel: dto.unitLabel ?? keyResult.unitLabel,
        startValue:
          dto.startValue !== undefined
            ? new Prisma.Decimal(dto.startValue)
            : keyResult.startValue,
        targetValue:
          dto.targetValue !== undefined
            ? new Prisma.Decimal(dto.targetValue)
            : keyResult.targetValue,
        currentValue:
          dto.currentValue !== undefined
            ? new Prisma.Decimal(dto.currentValue)
            : keyResult.currentValue,
        weight:
          dto.weight !== undefined
            ? new Prisma.Decimal(dto.weight)
            : keyResult.weight,
      },
    });

    // Tự động tính lại tiến độ của Objective cha
    await this.objectivesService.recalculateProgress(keyResult.objectiveId);

    return updated;
  }

  /**
   * Xóa Key Result và tự động tính toán lại tiến độ Objective.
   */
  async remove(id: string | bigint) {
    const krId = typeof id === 'bigint' ? id : BigInt(id);

    const keyResult = await this.prisma.keyResult.findFirst({
      where: { id: krId, deletedAt: null },
      include: {
        objective: {
          include: { cycle: true },
        },
      },
    });

    if (!keyResult) {
      throw new NotFoundException(`Không tìm thấy Key Result với ID ${id}`);
    }

    if (keyResult.objective.cycle.status === Status.CLOSED) {
      throw new BadRequestException(
        'Chu kỳ đã bị KHÓA (CLOSED), không thể xóa Key Result',
      );
    }

    await this.prisma.keyResult.update({
      where: { id: krId },
      data: { deletedAt: new Date() },
    });

    // Tự động tính lại tiến độ của Objective cha sau khi xóa KR
    await this.objectivesService.recalculateProgress(keyResult.objectiveId);

    return { message: `Đã xóa thành công Key Result "${keyResult.title}"` };
  }
}
