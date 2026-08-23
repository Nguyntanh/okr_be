import { ApiPropertyOptional } from '@nestjs/swagger';
import { UnitType } from '../../../generated/prisma/client';

export class UpdateKeyResultDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề Key Result',
    example: 'Đạt tối thiểu 100 khách hàng doanh nghiệp trả phí',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'ID người phụ trách',
    example: '2',
  })
  ownerId?: string | number;

  @ApiPropertyOptional({
    description: 'Loại đơn vị đo',
    enum: UnitType,
    example: UnitType.NUMERIC,
  })
  unitType?: UnitType;

  @ApiPropertyOptional({
    description: 'Nhãn đơn vị đo',
    example: 'khách hàng',
  })
  unitLabel?: string;

  @ApiPropertyOptional({
    description: 'Giá trị bắt đầu',
    example: 0,
  })
  startValue?: number;

  @ApiPropertyOptional({
    description: 'Giá trị mục tiêu',
    example: 100,
  })
  targetValue?: number;

  @ApiPropertyOptional({
    description: 'Giá trị hiện tại',
    example: 45,
  })
  currentValue?: number;

  @ApiPropertyOptional({
    description: 'Trọng số KR',
    example: 1.0,
  })
  weight?: number;
}
