import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description:
      'Mã vai trò viết hoa không dấu, duy nhất (VD: TEAM_LEAD, AUDITOR)',
    example: 'TEAM_LEAD',
  })
  code: string;

  @ApiProperty({
    description: 'Tên hiển thị của vai trò',
    example: 'Trưởng nhóm kỹ thuật',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả chức năng, nhiệm vụ của vai trò',
    example: 'Chịu trách nhiệm quản lý tiến độ và đánh giá OKR của nhóm',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Danh sách ID hoặc mã quyền ban đầu gán cho vai trò',
    example: ['1', '2', '3'],
  })
  permissionIds?: (string | number)[];
}
