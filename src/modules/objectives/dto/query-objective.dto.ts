import { ApiPropertyOptional } from '@nestjs/swagger';
import { ObjectiveLevel, Status } from '../../../generated/prisma/client';

export class QueryObjectiveDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID chu kỳ OKR',
    example: '1',
  })
  cycleId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID phòng ban',
    example: '1',
  })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID người sở hữu',
    example: '2',
  })
  ownerId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo cấp độ OKR (COMPANY, DEPARTMENT, INDIVIDUAL)',
    enum: ObjectiveLevel,
    example: ObjectiveLevel.DEPARTMENT,
  })
  level?: ObjectiveLevel;

  @ApiPropertyOptional({
    description:
      'Lọc theo trạng thái phê duyệt (DRAFT, PENDING, APPROVED, REJECTED, CLOSED)',
    enum: Status,
    example: Status.APPROVED,
  })
  status?: Status;

  @ApiPropertyOptional({
    description:
      'Nếu true, chỉ lấy các OKR do người dùng hiện tại sở hữu hoặc làm approver',
    example: 'true',
  })
  mine?: string;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo từ khóa trong tiêu đề Mục tiêu',
    example: 'doanh thu',
  })
  search?: string;
}
