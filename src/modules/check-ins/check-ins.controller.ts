import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckInsService } from './check-ins.service';
import { CreateCheckInDto } from './dto/create-checkin.dto';
import { ReviewCheckInDto } from './dto/review-checkin.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Check-ins (Cập nhật Tiến độ & Phê duyệt)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller()
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post('key-results/:krId/check-ins')
  @RequirePermissions('checkin:create')
  @ApiOperation({
    summary: 'Thực hiện Check-in tiến độ cho một Key Result',
    description:
      'Cập nhật giá trị mới (newValue), điểm tự tin (confidenceScore), ghi chú và khó khăn gặp phải (blocker).',
  })
  async create(
    @Request() req: any,
    @Param('krId') krId: string,
    @Body() dto: CreateCheckInDto,
  ) {
    return this.checkInsService.create(krId, req.user.sub, dto);
  }

  @Get('key-results/:krId/check-ins')
  @RequirePermissions('checkin:read')
  @ApiOperation({
    summary:
      'Xem lịch sử Check-in (Audit Log) của một Key Result theo thứ tự mới nhất',
  })
  async getHistory(@Param('krId') krId: string) {
    return this.checkInsService.getHistoryByKeyResult(krId);
  }

  @Get('check-ins/pending-reviews')
  @RequirePermissions('checkin:review')
  @ApiOperation({
    summary:
      'Xem danh sách yêu cầu Check-in từ nhân viên cấp dưới đang chờ Quản lý duyệt (PENDING)',
  })
  async getPendingReviews(@Request() req: any) {
    return this.checkInsService.getPendingReviews(req.user.sub);
  }

  @Patch('check-ins/:id/review')
  @RequirePermissions('checkin:review')
  @ApiOperation({
    summary:
      'Quản lý phê duyệt (APPROVED) hoặc từ chối (REJECTED) bản Check-in',
    description:
      'Gửi kết quả duyệt kèm phản hồi (reviewerFeedback). Khi APPROVED, giá trị mới sẽ chính thức được cập nhật lên Key Result và tính lại % tiến độ Mục tiêu.',
  })
  async review(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewCheckInDto,
  ) {
    return this.checkInsService.review(id, req.user.sub, dto);
  }
}
