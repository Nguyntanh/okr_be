import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Tên phòng ban',
    example: 'Phòng Kỹ thuật & Công nghệ',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả nhiệm vụ, chức năng của phòng ban',
    example: 'Phụ trách phát triển và vận hành hệ thống phần mềm công ty',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'ID phòng ban cha (để xây dựng cấu trúc cây phân cấp cha-con)',
    example: '1',
  })
  parentId?: string | number;

  @ApiPropertyOptional({
    description: 'ID người quản lý / Trưởng phòng (Manager)',
    example: '2',
  })
  managerId?: string | number;
}
