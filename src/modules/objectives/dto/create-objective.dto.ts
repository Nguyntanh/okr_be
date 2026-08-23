import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConfidenceScore,
  ObjectiveLevel,
} from '../../../generated/prisma/client';
import { CreateKeyResultDto } from './create-key-result.dto';

export class CreateObjectiveDto {
  @ApiProperty({
    description: 'Tiêu đề Mục tiêu',
    example: 'Nâng cao chất lượng trải nghiệm người dùng trên nền tảng số',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết mục tiêu chiến lược',
    example: 'Tối ưu tốc độ tải trang, giảm tỷ lệ lỗi và nâng cao chỉ số NPS',
  })
  description?: string;

  @ApiProperty({
    description:
      'Cấp độ Mục tiêu (COMPANY: Toàn công ty, DEPARTMENT: Phòng ban, INDIVIDUAL: Cá nhân)',
    enum: ObjectiveLevel,
    example: ObjectiveLevel.DEPARTMENT,
  })
  level: ObjectiveLevel;

  @ApiProperty({
    description: 'ID chu kỳ OKR gắn với mục tiêu này',
    example: '1',
  })
  cycleId: string | number;

  @ApiPropertyOptional({
    description: 'ID phòng ban (Bắt buộc nếu level là DEPARTMENT)',
    example: '1',
  })
  departmentId?: string | number;

  @ApiPropertyOptional({
    description:
      'ID người sở hữu mục tiêu (Mặc định là người tạo nếu không truyền)',
    example: '2',
  })
  ownerId?: string | number;

  @ApiPropertyOptional({
    description:
      'ID người phê duyệt mục tiêu (Thường là Quản lý trực tiếp / Trưởng phòng)',
    example: '1',
  })
  approverId?: string | number;

  @ApiPropertyOptional({
    description: 'Độ tự tin hoàn thành mục tiêu (LOW, MEDIUM, HIGH)',
    enum: ConfidenceScore,
    example: ConfidenceScore.HIGH,
  })
  confidenceScore?: ConfidenceScore;

  @ApiPropertyOptional({
    description: 'Trọng số của mục tiêu (Mặc định 1.00)',
    example: 1.0,
  })
  weight?: number;

  @ApiPropertyOptional({
    description: 'Danh sách Key Results ban đầu khởi tạo kèm Mục tiêu',
    type: [CreateKeyResultDto],
  })
  keyResults?: CreateKeyResultDto[];
}
