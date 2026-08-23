import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConfidenceScore,
  ObjectiveLevel,
} from '../../../generated/prisma/client';

export class UpdateObjectiveDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề Mục tiêu',
    example: 'Tăng trưởng doanh thu mảng phần mềm B2B',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết mục tiêu',
    example: 'Mở rộng thị phần doanh nghiệp vừa và lớn',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Cấp độ Mục tiêu',
    enum: ObjectiveLevel,
    example: ObjectiveLevel.DEPARTMENT,
  })
  level?: ObjectiveLevel;

  @ApiPropertyOptional({
    description: 'ID phòng ban',
    example: '1',
  })
  departmentId?: string | number | null;

  @ApiPropertyOptional({
    description: 'ID người sở hữu',
    example: '2',
  })
  ownerId?: string | number;

  @ApiPropertyOptional({
    description: 'ID người phê duyệt',
    example: '1',
  })
  approverId?: string | number | null;

  @ApiPropertyOptional({
    description: 'Độ tự tin hoàn thành mục tiêu',
    enum: ConfidenceScore,
    example: ConfidenceScore.MEDIUM,
  })
  confidenceScore?: ConfidenceScore;

  @ApiPropertyOptional({
    description: 'Trọng số của mục tiêu',
    example: 1.0,
  })
  weight?: number;
}
