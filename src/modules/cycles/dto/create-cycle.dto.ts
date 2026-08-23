import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CycleType, Status } from '../../../generated/prisma/client';

export class CreateCycleDto {
  @ApiProperty({
    description: 'Tiêu đề chu kỳ OKR',
    example: 'Chu kỳ Quý 1 - 2026',
  })
  title: string;

  @ApiProperty({
    description: 'Mã chu kỳ duy nhất',
    example: '2026-Q1',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'Loại chu kỳ (QUARTERLY: Theo Quý, ANNUAL: Theo Năm)',
    enum: CycleType,
    example: CycleType.QUARTERLY,
  })
  type?: CycleType;

  @ApiProperty({
    description: 'Ngày bắt đầu chu kỳ (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc chu kỳ (YYYY-MM-DD)',
    example: '2026-03-31',
  })
  endDate: string;

  @ApiPropertyOptional({
    description: 'ID chu kỳ cha (ví dụ chu kỳ Năm là cha của các chu kỳ Quý)',
    example: '1',
  })
  parentId?: string | number;

  @ApiPropertyOptional({
    description: 'Trạng thái ban đầu của chu kỳ',
    enum: Status,
    example: Status.ACTIVE,
  })
  status?: Status;
}
