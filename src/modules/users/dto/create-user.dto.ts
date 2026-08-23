import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email của người dùng',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({ description: 'Mật khẩu', example: 'Password@123' })
  password: string;

  @ApiProperty({ description: 'Họ và tên đầy đủ', example: 'Nguyen Van A' })
  fullName: string;

  @ApiPropertyOptional({
    description: 'Ảnh đại diện',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Chức danh công việc',
    example: 'Senior Software Engineer',
  })
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'ID phòng ban', example: '1' })
  departmentId?: string | number;

  @ApiPropertyOptional({ description: 'ID quản lý trực tiếp', example: '1' })
  managerId?: string | number;

  @ApiPropertyOptional({
    description: 'Danh sách ID vai trò gán cho người dùng',
    example: ['1', '2'],
  })
  roleIds?: (string | number)[];
}
