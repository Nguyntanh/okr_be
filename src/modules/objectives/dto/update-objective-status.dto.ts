import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../../../generated/prisma/client';

export class UpdateObjectiveStatusDto {
  @ApiProperty({
    description:
      'Trạng thái phê duyệt Mục tiêu (DRAFT: Nháp, PENDING: Chờ duyệt, APPROVED: Đã duyệt, REJECTED: Bị từ chối, CLOSED: Đã đóng)',
    enum: Status,
    example: Status.APPROVED,
  })
  status: Status;
}
