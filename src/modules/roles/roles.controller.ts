import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { AssignRoleUsersDto } from './dto/assign-role-users.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Roles (Vai trò & Phân quyền)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('role:read')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả các vai trò',
    description: 'Bao gồm số lượng người dùng và số lượng quyền được gán.',
  })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('role:read')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết một vai trò theo ID kèm danh sách quyền',
  })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermissions('role:create')
  @ApiOperation({
    summary: 'Tạo vai trò tùy chỉnh mới',
  })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('role:update')
  @ApiOperation({
    summary: 'Cập nhật thông tin cơ bản của vai trò (tên, mô tả)',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  @ApiOperation({
    summary: 'Xóa vai trò tùy chỉnh (Không cho phép xóa vai trò hệ thống)',
  })
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Get(':id/permissions')
  @RequirePermissions('role:read')
  @ApiOperation({
    summary: 'Lấy danh sách quyền hạn hiện tại của vai trò',
    description:
      'Dùng để nạp trạng thái checkbox ban đầu trên UI Bảng phân quyền.',
  })
  async getRolePermissions(@Param('id') id: string) {
    return this.rolesService.getRolePermissions(id);
  }

  @Put(':id/permissions')
  @RequirePermissions('role:update')
  @ApiOperation({
    summary: 'Cập nhật danh sách quyền cho vai trò từ Bảng phân quyền',
    description:
      'Gửi mảng permissionIds hoặc permissionCodes để cập nhật lại toàn bộ phân quyền cho vai trò này.',
  })
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(id, dto);
  }

  @Get(':id/users')
  @RequirePermissions('role:read')
  @ApiOperation({
    summary: 'Lấy danh sách người dùng được gán vào vai trò này',
    description:
      'Phục vụ hiển thị danh sách avatar / thành viên trong cột Vai trò trên Bảng phân quyền.',
  })
  async getRoleUsers(@Param('id') id: string) {
    return this.rolesService.getRoleUsers(id);
  }

  @Post(':id/users')
  @RequirePermissions('role:update')
  @ApiOperation({
    summary: 'Gán thêm người dùng vào vai trò trực tiếp từ Bảng phân quyền',
  })
  async assignUsersToRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleUsersDto,
  ) {
    return this.rolesService.assignUsersToRole(id, dto.userIds);
  }

  @Delete(':id/users/:userId')
  @RequirePermissions('role:update')
  @ApiOperation({
    summary: 'Thu hồi vai trò khỏi một người dùng',
  })
  async removeUserFromRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.removeUserFromRole(id, userId);
  }
}
