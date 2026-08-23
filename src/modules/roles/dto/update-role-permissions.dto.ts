import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiPropertyOptional({
    description:
      'Mảng danh sách các ID của Permission được chọn (dạng chuỗi hoặc số)',
    example: ['1', '2', '5', '8'],
  })
  permissionIds?: (string | number)[];

  @ApiPropertyOptional({
    description: 'Hoặc mảng danh sách các mã quyền (permission code)',
    example: ['objective:create', 'objective:read', 'checkin:create'],
  })
  permissionCodes?: string[];
}
