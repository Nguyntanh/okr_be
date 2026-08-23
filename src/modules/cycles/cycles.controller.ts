import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { UpdateCycleStatusDto } from './dto/update-cycle-status.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Cycles (Chu kỳ OKRs)')
@Controller('cycles')
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả các chu kỳ OKR (Công khai)',
    description:
      'Sắp xếp theo ngày bắt đầu mới nhất, kèm số lượng OKRs thuộc chu kỳ.',
  })
  async findAll() {
    return this.cyclesService.findAll();
  }

  @Get('current')
  @ApiOperation({
    summary:
      'Lấy chu kỳ OKR đang hoạt động hiện tại (Active / Theo ngày hôm nay)',
  })
  async findCurrent() {
    return this.cyclesService.findCurrent();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết một chu kỳ theo ID',
  })
  async findOne(@Param('id') id: string) {
    return this.cyclesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('cycle:create')
  @ApiOperation({
    summary: 'Tạo mới một chu kỳ OKR (Quý hoặc Năm)',
  })
  async create(@Request() req: any, @Body() dto: CreateCycleDto) {
    return this.cyclesService.create(req.user.sub, dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('cycle:update')
  @ApiOperation({
    summary: 'Cập nhật thông tin chu kỳ',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateCycleDto) {
    return this.cyclesService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('cycle:update')
  @ApiOperation({
    summary:
      'Khóa / Mở khóa hoặc đổi trạng thái chu kỳ (DRAFT, ACTIVE, CLOSED)',
    description:
      'Khi trạng thái chuyển sang CLOSED, toàn bộ OKR và Check-in trong chu kỳ sẽ bị đóng băng.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCycleStatusDto,
  ) {
    return this.cyclesService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('cycle:delete')
  @ApiOperation({
    summary: 'Xóa chu kỳ OKR (Kiểm tra xem chu kỳ có đang chứa mục tiêu không)',
  })
  async remove(@Param('id') id: string) {
    return this.cyclesService.remove(id);
  }
}
