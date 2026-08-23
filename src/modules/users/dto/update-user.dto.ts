import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../../../generated/prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Họ và tên đầy đủ',
    example: 'Nguyen Van A',
  })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Ảnh đại diện',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Chức danh công việc',
    example: 'Lead Developer',
  })
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'ID phòng ban', example: '1' })
  departmentId?: string | number;

  @ApiPropertyOptional({ description: 'ID quản lý trực tiếp', example: '1' })
  managerId?: string | number;

  @ApiPropertyOptional({
    description: 'Trạng thái tài khoản',
    enum: Status,
    example: Status.ACTIVE,
  })
  status?: Status;
}
