import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { Status } from '../../generated/prisma/client';

@Injectable()
export class CyclesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách tất cả các chu kỳ OKR (sắp xếp theo ngày bắt đầu giảm dần).
   */
  async findAll() {
    return this.prisma.cycle.findMany({
      where: { deletedAt: null },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
        _count: {
          select: {
            objectives: true,
            children: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Lấy chu kỳ OKR đang diễn ra hiện tại (ACTIVE hoặc khớp ngày hiện tại).
   */
  async findCurrent() {
    const today = new Date();

    // 1. Tìm chu kỳ ACTIVE mà ngày hiện tại nằm giữa startDate và endDate
    let currentCycle = await this.prisma.cycle.findFirst({
      where: {
        deletedAt: null,
        status: Status.ACTIVE,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        _count: {
          select: { objectives: true },
        },
      },
    });

    // 2. Nếu không tìm thấy, lấy chu kỳ ACTIVE gần nhất
    if (!currentCycle) {
      currentCycle = await this.prisma.cycle.findFirst({
        where: {
          deletedAt: null,
          status: Status.ACTIVE,
        },
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: { objectives: true },
          },
        },
      });
    }

    // 3. Nếu vẫn không có, lấy chu kỳ mới nhất
    if (!currentCycle) {
      currentCycle = await this.prisma.cycle.findFirst({
        where: { deletedAt: null },
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: { objectives: true },
          },
        },
      });
    }

    return currentCycle;
  }

  /**
   * Lấy chi tiết chu kỳ theo ID kèm thống kê số lượng Mục tiêu.
   */
  async findOne(id: string | bigint) {
    const cycleId = typeof id === 'bigint' ? id : BigInt(id);

    const cycle = await this.prisma.cycle.findFirst({
      where: { id: cycleId, deletedAt: null },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
        children: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            code: true,
            status: true,
          },
        },
        _count: {
          select: {
            objectives: true,
            children: true,
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Không tìm thấy chu kỳ với ID ${id}`);
    }

    return cycle;
  }

  /**
   * Khởi tạo chu kỳ OKR mới.
   */
  async create(userId: string | bigint, dto: CreateCycleDto) {
    const creatorId = typeof userId === 'bigint' ? userId : BigInt(userId);
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.cycle.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(
        `Mã chu kỳ "${code}" đã tồn tại trên hệ thống`,
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Ngày kết thúc phải lớn hơn ngày bắt đầu');
    }

    return this.prisma.cycle.create({
      data: {
        title: dto.title,
        code,
        type: dto.type,
        startDate,
        endDate,
        status: dto.status ?? Status.ACTIVE,
        parentId: dto.parentId ? BigInt(dto.parentId) : null,
        createdBy: creatorId,
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Cập nhật thông tin chu kỳ.
   */
  async update(id: string | bigint, dto: UpdateCycleDto) {
    const cycleId = typeof id === 'bigint' ? id : BigInt(id);

    const cycle = await this.prisma.cycle.findFirst({
      where: { id: cycleId, deletedAt: null },
    });

    if (!cycle) {
      throw new NotFoundException(`Không tìm thấy chu kỳ với ID ${id}`);
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : cycle.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : cycle.endDate;

    if (startDate >= endDate) {
      throw new BadRequestException('Ngày kết thúc phải lớn hơn ngày bắt đầu');
    }

    return this.prisma.cycle.update({
      where: { id: cycleId },
      data: {
        title: dto.title ?? cycle.title,
        type: dto.type ?? cycle.type,
        startDate,
        endDate,
        parentId:
          dto.parentId !== undefined
            ? dto.parentId
              ? BigInt(dto.parentId)
              : null
            : cycle.parentId,
      },
    });
  }

  /**
   * Khóa hoặc thay đổi trạng thái chu kỳ (DRAFT, ACTIVE, CLOSED).
   * Khi trạng thái là CLOSED, chu kỳ sẽ đóng băng toàn bộ OKR và Check-in.
   */
  async updateStatus(id: string | bigint, status: Status) {
    const cycleId = typeof id === 'bigint' ? id : BigInt(id);

    const cycle = await this.prisma.cycle.findFirst({
      where: { id: cycleId, deletedAt: null },
    });

    if (!cycle) {
      throw new NotFoundException(`Không tìm thấy chu kỳ với ID ${id}`);
    }

    return this.prisma.cycle.update({
      where: { id: cycleId },
      data: { status },
    });
  }

  /**
   * Xóa chu kỳ OKR (Kiểm tra ràng buộc Mục tiêu).
   */
  async remove(id: string | bigint) {
    const cycleId = typeof id === 'bigint' ? id : BigInt(id);

    const cycle = await this.prisma.cycle.findFirst({
      where: { id: cycleId, deletedAt: null },
      include: {
        objectives: { where: { deletedAt: null } },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Không tìm thấy chu kỳ với ID ${id}`);
    }

    if (cycle.objectives.length > 0) {
      throw new BadRequestException(
        `Không thể xóa chu kỳ "${cycle.title}" vì đang chứa ${cycle.objectives.length} Mục tiêu OKR`,
      );
    }

    await this.prisma.cycle.update({
      where: { id: cycleId },
      data: { deletedAt: new Date() },
    });

    return { message: `Đã xóa thành công chu kỳ "${cycle.title}"` };
  }
}
