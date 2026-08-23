import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitType } from '../../../generated/prisma/client';

export class CreateKeyResultDto {
  @ApiProperty({
    description: 'Tiêu đề Kết quả then chốt (Key Result)',
    example: 'Giảm thời gian phản hồi API trung bình xuống dưới 200ms',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'ID người phụ trách KR (Mặc định là Owner của Objective)',
    example: '2',
  })
  ownerId?: string | number;

  @ApiPropertyOptional({
    description:
      'Loại đơn vị đo lường (PERCENTAGE, CURRENCY, NUMERIC, BOOLEAN)',
    enum: UnitType,
    example: UnitType.NUMERIC,
  })
  unitType?: UnitType;

  @ApiPropertyOptional({
    description: 'Nhãn đơn vị đo (VD: %, ms, VNĐ, tasks)',
    example: 'ms',
  })
  unitLabel?: string;

  @ApiPropertyOptional({
    description: 'Giá trị bắt đầu ban đầu (Mặc định 0)',
    example: 450,
  })
  startValue?: number;

  @ApiProperty({
    description: 'Giá trị mục tiêu cần đạt được',
    example: 200,
  })
  targetValue: number;

  @ApiPropertyOptional({
    description: 'Giá trị hiện tại (Mặc định bằng startValue)',
    example: 450,
  })
  currentValue?: number;

  @ApiPropertyOptional({
    description: 'Trọng số của KR này trong Objective (Mặc định 1.0)',
    example: 1.0,
  })
  weight?: number;
}
