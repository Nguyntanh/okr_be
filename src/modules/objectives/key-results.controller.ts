import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeyResultsService } from './key-results.service';
import { CreateKeyResultDto } from './dto/create-key-result.dto';
import { UpdateKeyResultDto } from './dto/update-key-result.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Key Results (Kết quả then chốt)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller()
export class KeyResultsController {
  constructor(private readonly keyResultsService: KeyResultsService) {}

  @Get('key-results/:id')
  @RequirePermissions('keyresult:read')
  @ApiOperation({
    summary: 'Lấy chi tiết Key Result kèm lịch sử Check-ins gần nhất',
  })
  async findOne(@Param('id') id: string) {
    return this.keyResultsService.findOne(id);
  }

  @Post('objectives/:objectiveId/key-results')
  @RequirePermissions('keyresult:create')
  @ApiOperation({
    summary: 'Thêm Key Result mới vào một Mục tiêu cụ thể',
    description:
      'Hệ thống sẽ tự động tính toán lại % tiến độ tổng của Mục tiêu.',
  })
  async create(
    @Param('objectiveId') objectiveId: string,
    @Body() dto: CreateKeyResultDto,
  ) {
    return this.keyResultsService.create(objectiveId, dto);
  }

  @Put('key-results/:id')
  @RequirePermissions('keyresult:update')
  @ApiOperation({
    summary: 'Cập nhật Key Result (Chỉ tiêu, Đơn vị, Trọng số)',
    description:
      'Hệ thống sẽ tự động cập nhật lại % tiến độ tổng của Mục tiêu.',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateKeyResultDto) {
    return this.keyResultsService.update(id, dto);
  }

  @Delete('key-results/:id')
  @RequirePermissions('keyresult:delete')
  @ApiOperation({
    summary: 'Xóa Key Result (Tự động tính lại tiến độ của Mục tiêu)',
  })
  async remove(@Param('id') id: string) {
    return this.keyResultsService.remove(id);
  }
}
