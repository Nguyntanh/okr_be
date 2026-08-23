import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Users (Người dùng)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user:read')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả người dùng kèm phòng ban và vai trò',
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('user:read')
  @ApiOperation({
    summary: 'Lấy chi tiết một người dùng theo ID',
  })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermissions('user:create')
  @ApiOperation({
    summary: 'Tạo mới một tài khoản người dùng',
  })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('user:update')
  @ApiOperation({
    summary: 'Cập nhật thông tin người dùng',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Put(':id/roles')
  @RequirePermissions('role:update')
  @ApiOperation({
    summary: 'Gán danh sách vai trò cho người dùng (Dynamic Role Assignment)',
    description:
      'Gửi danh sách roleIds hoặc roleCodes để cập nhật lại các vai trò của người dùng.',
  })
  async assignRoles(@Param('id') id: string, @Body() dto: AssignUserRolesDto) {
    return this.usersService.assignRoles(id, dto);
  }

  @Get(':id/permissions')
  @RequirePermissions('role:read')
  @ApiOperation({
    summary:
      'Tra cứu danh sách vai trò và quyền hạn chi tiết của một người dùng',
  })
  async getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }
}
