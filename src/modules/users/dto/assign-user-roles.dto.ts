import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignUserRolesDto {
  @ApiPropertyOptional({
    description:
      'Danh sách ID của các vai trò (Role IDs) cần gán cho người dùng',
    example: ['1', '2'],
  })
  roleIds?: (string | number)[];

  @ApiPropertyOptional({
    description: 'Hoặc danh sách mã vai trò (Role Codes)',
    example: ['MANAGER', 'EMPLOYEE'],
  })
  roleCodes?: string[];
}
