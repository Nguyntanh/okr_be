import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import * as dotenv from 'dotenv';

// Tải các biến môi trường từ file .env
dotenv.config();

/**
 * 1. Khai báo Interface Cấu hình Seed để tuân thủ Dependency Inversion (D trong SOLID)
 */
// prettier-ignore
interface AdminSeedConfig {
  email: string;
  plainPassword: string;
  fullName: string;
  roleCode: string; // Changed from 'role: Role' to 'roleCode: string'
  saltRounds: number;
}

/**
 * Cấu hình Admin từ Environment Variables (Sử dụng Fallback an toàn)
 */
// prettier-ignore
const DEFAULT_ADMIN_CONFIG: AdminSeedConfig = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
  plainPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
  fullName: 'System Administrator',
  roleCode: 'SUPER_ADMIN',
  saltRounds: 10,
};

// prettier-ignore
const PERMISSIONS: Prisma.PermissionCreateInput[] = [
  { code: 'user:create', action: 'create', subject: 'User', module: 'users', description: 'Tạo mới tài khoản người dùng' },
  { code: 'user:read', action: 'read', subject: 'User', module: 'users', description: 'Xem danh sách và thông tin chi tiết người dùng' },
  { code: 'user:update', action: 'update', subject: 'User', module: 'users', description: 'Chỉnh sửa thông tin người dùng' },
  { code: 'user:delete', action: 'delete', subject: 'User', module: 'users', description: 'Xóa hoặc vô hiệu hóa tài khoản người dùng' },
  { code: 'role:create', action: 'create', subject: 'Role', module: 'roles', description: 'Tạo mới vai trò (Role)' },
  { code: 'role:read', action: 'read', subject: 'Role', module: 'roles', description: 'Xem danh sách vai trò và phân quyền' },
  { code: 'role:update', action: 'update', subject: 'Role', module: 'roles', description: 'Cập nhật vai trò và gán permissions' },
  { code: 'role:delete', action: 'delete', subject: 'Role', module: 'roles', description: 'Xóa vai trò tùy chỉnh' },
  { code: 'department:create', action: 'create', subject: 'Department', module: 'departments', description: 'Tạo mới phòng ban' },
  { code: 'department:read', action: 'read', subject: 'Department', module: 'departments', description: 'Xem sơ đồ và thông tin phòng ban' },
  { code: 'department:update', action: 'update', subject: 'Department', module: 'departments', description: 'Chỉnh sửa thông tin phòng ban/Gán Manager' },
  { code: 'department:delete', action: 'delete', subject: 'Department', module: 'departments', description: 'Xóa phòng ban' },
  { code: 'cycle:create', action: 'create', subject: 'Cycle', module: 'cycles', description: 'Tạo mới chu kỳ OKR (Năm/Quý)' },
  { code: 'cycle:read', action: 'read', subject: 'Cycle', module: 'cycles', description: 'Xem danh sách chu kỳ OKR' },
  { code: 'cycle:update', action: 'update', subject: 'Cycle', module: 'cycles', description: 'Chỉnh sửa thời gian/mô tả chu kỳ' },
  { code: 'cycle:delete', action: 'delete', subject: 'Cycle', module: 'cycles', description: 'Xóa chu kỳ OKR' },
  { code: 'objective:create', action: 'create', subject: 'Objective', module: 'objectives', description: 'Tạo mới Mục tiêu (Công ty/Phòng ban/Cá nhân)' },
  { code: 'objective:read', action: 'read', subject: 'Objective', module: 'objectives', description: 'Xem chi tiết Mục tiêu' },
  { code: 'objective:update', action: 'update', subject: 'Objective', module: 'objectives', description: 'Chỉnh sửa tiêu đề, mô tả, trọng số Mục tiêu' },
  { code: 'objective:delete', action: 'delete', subject: 'Objective', module: 'objectives', description: 'Xóa Mục tiêu' },
  { code: 'objective:approve', action: 'approve', subject: 'Objective', module: 'objectives', description: 'Phê duyệt hoặc từ chối OKR' },
  { code: 'keyresult:create', action: 'create', subject: 'KeyResult', module: 'key_results', description: 'Thêm Key Result vào Objective' },
  { code: 'keyresult:read', action: 'read', subject: 'KeyResult', module: 'key_results', description: 'Xem chi tiết Key Result' },
  { code: 'keyresult:update', action: 'update', subject: 'KeyResult', module: 'key_results', description: 'Sửa chỉ tiêu, đơn vị tính của Key Result' },
  { code: 'keyresult:delete', action: 'delete', subject: 'KeyResult', module: 'key_results', description: 'Xóa Key Result' },
  { code: 'alignment:create', action: 'create', subject: 'ObjectiveAlignment', module: 'alignments', description: 'Tạo liên kết gióng hàng (Dọc/Ngang) giữa các OKR' },
  { code: 'alignment:read', action: 'read', subject: 'ObjectiveAlignment', module: 'alignments', description: 'Xem bản đồ gióng hàng OKR' },
  { code: 'alignment:delete', action: 'delete', subject: 'ObjectiveAlignment', module: 'alignments', description: 'Hủy liên kết gióng hàng OKR' },
  { code: 'checkin:create', action: 'create', subject: 'CheckIn', module: 'checkins', description: 'Tạo bản Check-in tiến độ mới' },
  { code: 'checkin:read', action: 'read', subject: 'CheckIn', module: 'checkins', description: 'Xem lịch sử Check-in' },
  { code: 'checkin:update', action: 'update', subject: 'CheckIn', module: 'checkins', description: 'Sửa bản Check-in nháp trước khi gửi' },
  { code: 'checkin:delete', action: 'delete', subject: 'CheckIn', module: 'checkins', description: 'Hủy/Xóa bản Check-in' },
  { code: 'checkin:review', action: 'approve', subject: 'CheckIn', module: 'checkins', description: 'Review, cho phản hồi và phê duyệt Check-in' },
  { code: 'report:read', action: 'read', subject: 'Report', module: 'reports', description: 'Xem báo cáo tiến độ, Dashboard thống kê OKRs' },
];

// prettier-ignore
const ROLES: Prisma.RoleCreateInput[] = [
  { code: 'SUPER_ADMIN', name: 'Quản trị viên cấp cao', description: 'Có toàn quyền truy cập và quản lý hệ thống.', isSystem: true },
  { code: 'OKR_CHAMPION', name: 'OKR Champion', description: 'Chịu trách nhiệm triển khai, đào tạo và duy trì quy trình OKR trong tổ chức.', isSystem: false },
  { code: 'MANAGER', name: 'Quản lý', description: 'Quản lý một đội nhóm hoặc phòng ban, chịu trách nhiệm về OKR của đội.', isSystem: false },
  { code: 'EMPLOYEE', name: 'Nhân viên', description: 'Người dùng thông thường, chịu trách nhiệm về OKR cá nhân.', isSystem: false },
  { code: 'VIEWER', name: 'Người xem', description: 'Chỉ có quyền xem các OKR công khai, không có quyền chỉnh sửa.', isSystem: false },
];

/**
 * 2. Factory khởi tạo Prisma Adapter cho MariaDB/MySQL
 */
function createPrismaClientInstance(): PrismaClient {
  const connectionUrl = process.env.DATABASE_URL;

  if (!connectionUrl) {
    throw new Error(
      '❌ CRITICAL: DATABASE_URL is not set in environment variables.',
    );
  }

  // Prisma MariaDB adapter accepts a connection string.
  const adapter = new PrismaMariaDb(connectionUrl);

  return new PrismaClient({ adapter });
}

/**
 * 3. Core Logic: Khởi tạo Admin Account (Đảm bảo tính Idempotency)
 */
async function seedDefaultAdmin(
  prisma: PrismaClient,
  config: AdminSeedConfig,
): Promise<void> {
  const hashedPassword = await bcrypt.hash(
    config.plainPassword,
    config.saltRounds,
  );

  // Step 1: Seed all Permissions
  console.log('🌱 Seeding permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }
  const allPermissions = await prisma.permission.findMany();
  console.log(`✅ Seeded ${allPermissions.length} permissions.`);

  // Step 2: Seed all Roles
  console.log('🌱 Seeding roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }
  console.log(`✅ Seeded ${ROLES.length} roles.`);

  // Step 3: Find the essential SUPER_ADMIN role
  const superAdminRole = await prisma.role.findUnique({
    where: { code: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) {
    console.error(
      '❌ CRITICAL: SUPER_ADMIN role not found after seeding. Aborting.',
    );
    throw new Error('SUPER_ADMIN role is missing.');
  }
  console.log(`🔍 Found essential role: ${superAdminRole.name}`);

  // Step 4: Grant all permissions to SUPER_ADMIN role
  const relations = allPermissions.map((permission) => ({
    roleId: superAdminRole.id,
    permissionId: permission.id,
  }));
  await prisma.rolePermission.createMany({
    data: relations,
    skipDuplicates: true, // Bỏ qua nếu cặp role-permission đã tồn tại
  });
  console.log(
    `🔗 Granted all ${allPermissions.length} permissions to SUPER_ADMIN.`,
  );

  // Step 5: Upsert the Admin User.
  const adminUser = await prisma.user.upsert({
    where: { email: config.email },
    update: {
      password: hashedPassword, // Luôn cập nhật lại mật khẩu khi chạy seed để đảm bảo an toàn
    },
    create: {
      email: config.email,
      password: hashedPassword,
      fullName: config.fullName,
      // The 'role' field is no longer on the User model
    },
  });
  console.log(`✅ Admin user "${adminUser.email}" is ready.`);

  // Step 6: Assign the SUPER_ADMIN Role to the admin user.
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {}, // Nothing to update if the link already exists
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  console.log(
    `🔗 Successfully assigned role "${superAdminRole.code}" to user "${adminUser.email}".`,
  );
}

/**
 * 4. Application Entry Point & Clean Lifecycle Management
 */
async function main() {
  const prisma = createPrismaClientInstance();

  try {
    console.log('🔄 Starting Database Seeding...');
    await seedDefaultAdmin(prisma, DEFAULT_ADMIN_CONFIG);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected Prisma.');
  }
}

main();
