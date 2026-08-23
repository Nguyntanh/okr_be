import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleUsersDto {
  @ApiProperty({
    description: 'Danh sách ID của những người dùng cần gán vào vai trò này',
    example: ['2', '3', '4'],
    type: [String],
  })
  userIds!: string[];
}
