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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Departments (Cơ cấu Phòng ban)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions('department:read')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả các phòng ban trong công ty',
  })
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get('tree')
  @RequirePermissions('department:read')
  @ApiOperation({
    summary:
      'Lấy cấu trúc cây phân cấp phòng ban cha - con (Organization Tree)',
  })
  async getTree() {
    return this.departmentsService.getTree();
  }

  @Get(':id')
  @RequirePermissions('department:read')
  @ApiOperation({
    summary: 'Lấy chi tiết phòng ban theo ID kèm danh sách thành viên',
  })
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @RequirePermissions('department:create')
  @ApiOperation({
    summary: 'Tạo phòng ban mới và gán Trưởng phòng',
  })
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('department:update')
  @ApiOperation({
    summary:
      'Cập nhật thông tin phòng ban, chuyển cấp cha hoặc đổi Trưởng phòng',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('department:delete')
  @ApiOperation({
    summary: 'Xóa phòng ban (Kiểm tra ràng buộc phòng ban con)',
  })
  async remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
