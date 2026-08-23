import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Tên hiển thị của vai trò',
    example: 'Quản trị viên bộ phận',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết vai trò',
    example: 'Cập nhật quyền hạn và phạm vi quản lý',
  })
  description?: string;
}
