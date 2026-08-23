import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlignmentType } from '../../../generated/prisma/client';

export class CreateAlignmentDto {
  @ApiProperty({
    description:
      'ID của Mục tiêu đích cần gióng hàng tới (thường là Mục tiêu cấp trên hoặc phòng ban khác)',
    example: '1',
  })
  alignedToObjId: string | number;

  @ApiPropertyOptional({
    description:
      'Loại gióng hàng (VERTICAL: Dọc - cấp trên/dưới, CROSS: Chéo - liên phòng ban)',
    enum: AlignmentType,
    example: AlignmentType.VERTICAL,
  })
  alignmentType?: AlignmentType;
}
