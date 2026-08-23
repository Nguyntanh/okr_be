import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ObjectivesService } from './objectives.service';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';
import { UpdateObjectiveStatusDto } from './dto/update-objective-status.dto';
import { QueryObjectiveDto } from './dto/query-objective.dto';
import { CreateAlignmentDto } from './dto/create-alignment.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Objectives (Mục tiêu OKRs)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('objectives')
export class ObjectivesController {
  constructor(private readonly objectivesService: ObjectivesService) {}

  @Get()
  @RequirePermissions('objective:read')
  @ApiOperation({
    summary: 'Lấy danh sách Mục tiêu kèm bộ lọc phong phú',
    description:
      'Hỗ trợ lọc theo Chu kỳ (cycleId), Phòng ban (departmentId), Người sở hữu (ownerId), Cấp độ (level), Trạng thái duyệt (status), hoặc cờ mine=true (OKR của tôi).',
  })
  async findAll(@Request() req: any, @Query() query: QueryObjectiveDto) {
    return this.objectivesService.findAll(query, req.user?.sub);
  }

  @Get(':id')
  @RequirePermissions('objective:read')
  @ApiOperation({
    summary:
      'Lấy chi tiết Mục tiêu kèm Key Results, Gióng hàng và Check-in gần nhất',
  })
  async findOne(@Param('id') id: string) {
    return this.objectivesService.findOne(id);
  }

  @Post()
  @RequirePermissions('objective:create')
  @ApiOperation({
    summary: 'Tạo Mục tiêu mới (có thể đính kèm danh sách Key Results ban đầu)',
  })
  async create(@Request() req: any, @Body() dto: CreateObjectiveDto) {
    return this.objectivesService.create(req.user.sub, dto);
  }

  @Put(':id')
  @RequirePermissions('objective:update')
  @ApiOperation({
    summary: 'Cập nhật thông tin Mục tiêu',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateObjectiveDto) {
    return this.objectivesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('objective:approve')
  @ApiOperation({
    summary:
      'Phê duyệt hoặc chuyển đổi trạng thái Mục tiêu (DRAFT -> PENDING -> APPROVED / REJECTED)',
    description:
      'Dành cho Quản lý (Manager/Approver) để phê duyệt hoặc từ chối mục tiêu cấp dưới.',
  })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveStatusDto,
  ) {
    return this.objectivesService.updateStatus(id, dto.status, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('objective:delete')
  @ApiOperation({
    summary: 'Xóa Mục tiêu (Soft delete)',
  })
  async remove(@Param('id') id: string) {
    return this.objectivesService.remove(id);
  }

  @Post(':id/alignments')
  @RequirePermissions('alignment:create')
  @ApiOperation({
    summary:
      'Thiết lập liên kết Gióng hàng (Dọc - Cấp trên/Dưới, hoặc Chéo - Liên phòng ban)',
  })
  async alignObjective(
    @Param('id') id: string,
    @Body() dto: CreateAlignmentDto,
  ) {
    return this.objectivesService.alignObjective(id, dto);
  }

  @Delete(':id/alignments/:targetObjId')
  @RequirePermissions('alignment:delete')
  @ApiOperation({
    summary: 'Hủy bỏ liên kết Gióng hàng giữa 2 Mục tiêu',
  })
  async removeAlignment(
    @Param('id') id: string,
    @Param('targetObjId') targetObjId: string,
  ) {
    return this.objectivesService.removeAlignment(id, targetObjId);
  }
}
