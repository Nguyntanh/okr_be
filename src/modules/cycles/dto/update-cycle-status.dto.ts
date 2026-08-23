import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../../../generated/prisma/client';

export class UpdateCycleStatusDto {
  @ApiProperty({
    description:
      'Trạng thái chu kỳ (DRAFT: Nháp, ACTIVE: Đang hoạt động, CLOSED: Đã khóa / Đóng băng dữ liệu)',
    enum: Status,
    example: Status.CLOSED,
  })
  status: Status;
}
