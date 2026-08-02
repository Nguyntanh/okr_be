import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient, Role } from '../src/generated/prisma/client';

/**
 * 1. Khai báo Interface Cấu hình Seed để tuân thủ Dependency Inversion (D trong SOLID)
 */
interface AdminSeedConfig {
  email: string;
  plainPassword: string;
  fullName: string;
  role: Role;
  saltRounds: number;
}

/**
 * Cấu hình Admin từ Environment Variables (Sử dụng Fallback an toàn)
 */
const DEFAULT_ADMIN_CONFIG: AdminSeedConfig = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
  plainPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
  fullName: 'System Administrator',
  role: Role.SUPER_ADMIN,
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

  // Sử dụng Upsert để đảm bảo Idempotent operation:
  // - Nếu chưa có: Tạo mới
  // - Nếu đã có: Không làm gì cả (update: {})
  const admin = await prisma.user.upsert({
    where: { email: config.email },
    update: {}, // Bỏ qua không overwrite thông tin nếu admin đã tồn tại
    create: {
      email: config.email,
      password: hashedPassword,
      fullName: config.fullName,
      role: config.role,
    },
  });

  console.log(
    `✅ Default Admin Seeded Successfully: [ID: ${admin.id} | Email: ${admin.email}]`,
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
