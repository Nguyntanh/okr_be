import { ApiPropertyOptional } from '@nestjs/swagger';
import { CycleType } from '../../../generated/prisma/client';

export class UpdateCycleDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề chu kỳ OKR',
    example: 'Chu kỳ Quý 1 - 2026 (Cập nhật)',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Loại chu kỳ',
    enum: CycleType,
    example: CycleType.QUARTERLY,
  })
  type?: CycleType;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2026-03-31',
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'ID chu kỳ cha',
    example: '1',
  })
  parentId?: string | number | null;
}
