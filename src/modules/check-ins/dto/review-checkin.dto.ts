import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../../../generated/prisma/client';

export class ReviewCheckInDto {
  @ApiProperty({
    description:
      'Kết quả phê duyệt bản check-in (APPROVED: Duyệt, REJECTED: Từ chối)',
    enum: [Status.APPROVED, Status.REJECTED],
    example: Status.APPROVED,
  })
  status: Status;

  @ApiPropertyOptional({
    description:
      'Lời nhắn phản hồi, nhận xét hoặc hướng dẫn từ Quản lý / Reviewer',
    example:
      'Tiến độ rất tốt, đã ghi nhận kết quả và trao đổi với đội Hạ tầng để cấp tài nguyên.',
  })
  reviewerFeedback?: string;
}
