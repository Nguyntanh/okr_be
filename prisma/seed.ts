import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * 1. Khai báo Interface Cấu hình Seed để tuân thủ Dependency Inversion (D trong SOLID)
 */
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
const DEFAULT_ADMIN_CONFIG: AdminSeedConfig = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
  plainPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
  fullName: 'System Administrator',
  roleCode: 'SUPER_ADMIN',
  saltRounds: 10,
};

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

  // Step 1: Upsert the Role to ensure it exists.
  const adminRole = await prisma.role.upsert({
    where: { code: config.roleCode },
    update: {},
    create: {
      code: config.roleCode,
      name: 'Super Administrator',
      description: 'Has all permissions in the system.',
    },
  });
  console.log(`✅ Role "${adminRole.name}" is ready.`);

  // Step 2: Upsert the User.
  const adminUser = await prisma.user.upsert({
    where: { email: config.email },
    update: {
      // You might want to update the password on re-seed for security reasons
      // password: hashedPassword,
    },
    create: {
      email: config.email,
      password: hashedPassword,
      fullName: config.fullName,
      // The 'role' field is no longer on the User model
    },
  });
  console.log(`✅ Admin user "${adminUser.email}" is ready.`);

  // Step 3: Assign the Role to the User via the join table.
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {}, // Nothing to update if the link already exists
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log(
    `🔗 Successfully assigned role "${adminRole.code}" to user "${adminUser.email}".`,
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
