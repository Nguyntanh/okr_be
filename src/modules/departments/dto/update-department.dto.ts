import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../../../generated/prisma/client';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({
    description: 'Tên phòng ban',
    example: 'Khối Công nghệ Thông tin',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết phòng ban',
    example: 'Bao gồm các phòng ban Kỹ thuật, QA và Vận hành hệ thống',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'ID phòng ban cha (truyền null nếu muốn đưa lên cấp cao nhất)',
    example: '1',
  })
  parentId?: string | number | null;

  @ApiPropertyOptional({
    description: 'ID người quản lý / Trưởng phòng (Manager)',
    example: '2',
  })
  managerId?: string | number | null;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động của phòng ban',
    enum: Status,
    example: Status.ACTIVE,
  })
  status?: Status;
}
