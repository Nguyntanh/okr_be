import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Permissions (Phân quyền)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('role:read')
  @ApiOperation({
    summary:
      'Lấy danh sách tất cả các quyền (Permissions) gom nhóm theo Module',
    description:
      'API cung cấp danh sách quyền chia theo module phục vụ hiển thị Bảng ma trận phân quyền trên giao diện Admin.',
  })
  async getGroupedPermissions() {
    return this.permissionsService.findAllGroupedByModule();
  }

  @Get('all')
  @RequirePermissions('role:read')
  @ApiOperation({
    summary: 'Lấy danh sách phẳng tất cả các quyền',
  })
  async getAllPermissions() {
    return this.permissionsService.findAll();
  }

  @Get('matrix')
  @RequirePermissions('role:read')
  @ApiOperation({
    summary:
      'Lấy dữ liệu toàn bộ ma trận phân quyền (Roles x Modules x Permissions)',
    description:
      'Trả về thông tin Roles, cấu trúc Modules/Permissions và trạng thái check của từng Role.',
  })
  async getMatrix() {
    return this.permissionsService.getPermissionMatrix();
  }
}
