import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  AlignmentType,
  ConfidenceScore,
  CycleType,
  ObjectiveLevel,
  Prisma,
  PrismaClient,
  Status,
  UnitType,
} from '../src/generated/prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

function createPrismaClientInstance(): PrismaClient {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error('❌ CRITICAL: DATABASE_URL is not set in environment variables.');
  }

  // Tự động cấu hình SSL Pool cho TiDB Cloud hoặc các kết nối SSL đặc thù
  if (connectionUrl.includes('tidbcloud.com') || connectionUrl.includes(':4000')) {
    const parsed = new URL(connectionUrl);
    const adapter = new PrismaMariaDb({
      host: parsed.hostname,
      port: Number(parsed.port) || 4000,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false,
      },
      connectTimeout: 30000,
    });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaMariaDb(connectionUrl);
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClientInstance();

  try {
    console.log('🚀 Bắt đầu khởi tạo dữ liệu mẫu Nâng cao: OKRs Đa cấp độ, Gióng hàng & Check-ins Timeline...');

    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

    // =========================================================================
    // 1. THIẾT LẬP CHU KỲ Q3 & Q4
    // =========================================================================
    console.log('📅 1. Thiết lập Chu kỳ OKRs...');

    let cycleQ3 = await prisma.cycle.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { code: '2026-Q3' },
          { code: 'Q3-2026' },
          { code: 'Q3' },
          { title: { contains: 'Q3' } },
          { title: { contains: 'Quý 3' } },
        ],
      },
    });

    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' },
    });

    if (!cycleQ3) {
      cycleQ3 = await prisma.cycle.create({
        data: {
          title: 'Chu kỳ Quý 3 - 2026',
          code: '2026-Q3',
          type: CycleType.QUARTERLY,
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-09-30'),
          status: Status.ACTIVE,
          createdBy: adminUser?.id ?? BigInt(1),
        },
      });
      console.log(`   ✅ Đã tạo chu kỳ: ${cycleQ3.title}`);
    } else {
      console.log(`   ℹ️ Gắn dữ liệu vào Chu kỳ Q3: ${cycleQ3.title} (ID: ${cycleQ3.id})`);
    }

    // =========================================================================
    // 2. KHỞI TẠO CƠ CẤU 8 PHÒNG BAN (ORGANIZATION TREE)
    // =========================================================================
    console.log('🏢 2. Thiết lập Cây Cơ cấu Tổ chức Phòng ban...');

    // 1. Ban Giám đốc
    const deptBod = await prisma.department.upsert({
      where: { id: BigInt(1) },
      update: { name: 'Ban Giám đốc', description: 'Cơ quan điều hành cấp cao' },
      create: { id: BigInt(1), name: 'Ban Giám đốc', description: 'Cơ quan điều hành cấp cao', status: Status.ACTIVE },
    });

    // 2. Khối Công nghệ & Sản phẩm (Trực thuộc BOD)
    const deptTech = await prisma.department.upsert({
      where: { id: BigInt(2) },
      update: { name: 'Khối Công nghệ & Sản phẩm', parentId: deptBod.id },
      create: { id: BigInt(2), name: 'Khối Công nghệ & Sản phẩm', parentId: deptBod.id, status: Status.ACTIVE },
    });

    // 3. Phòng Kỹ thuật Phần mềm (Trực thuộc Tech)
    const deptSoftware = await prisma.department.upsert({
      where: { id: BigInt(3) },
      update: { name: 'Phòng Kỹ thuật Phần mềm', parentId: deptTech.id },
      create: { id: BigInt(3), name: 'Phòng Kỹ thuật Phần mềm', parentId: deptTech.id, status: Status.ACTIVE },
    });

    // 4. Phòng Đảm bảo Chất lượng - QA (Trực thuộc Tech)
    const deptQA = await prisma.department.upsert({
      where: { id: BigInt(4) },
      update: { name: 'Phòng Đảm bảo Chất lượng (QA)', parentId: deptTech.id },
      create: { id: BigInt(4), name: 'Phòng Đảm bảo Chất lượng (QA)', parentId: deptTech.id, status: Status.ACTIVE },
    });

    // 5. Khối Kinh doanh & Tiếp thị (Trực thuộc BOD)
    const deptBusiness = await prisma.department.upsert({
      where: { id: BigInt(5) },
      update: { name: 'Khối Kinh doanh & Tiếp thị', parentId: deptBod.id },
      create: { id: BigInt(5), name: 'Khối Kinh doanh & Tiếp thị', parentId: deptBod.id, status: Status.ACTIVE },
    });

    // 6. Phòng Kinh doanh B2B (Trực thuộc Business)
    const deptSalesB2B = await prisma.department.upsert({
      where: { id: BigInt(6) },
      update: { name: 'Phòng Kinh doanh B2B', parentId: deptBusiness.id },
      create: { id: BigInt(6), name: 'Phòng Kinh doanh B2B', parentId: deptBusiness.id, status: Status.ACTIVE },
    });

    // 7. Phòng Tiếp thị Kỹ thuật số - Marketing (Trực thuộc Business)
    const deptMarketing = await prisma.department.upsert({
      where: { id: BigInt(7) },
      update: { name: 'Phòng Tiếp thị Kỹ thuật số (Marketing)', parentId: deptBusiness.id },
      create: { id: BigInt(7), name: 'Phòng Tiếp thị Kỹ thuật số (Marketing)', parentId: deptBusiness.id, status: Status.ACTIVE },
    });

    // 8. Phòng Nhân sự & Văn hóa (Trực thuộc BOD)
    const deptHR = await prisma.department.upsert({
      where: { id: BigInt(8) },
      update: { name: 'Phòng Nhân sự & Văn hóa', parentId: deptBod.id },
      create: { id: BigInt(8), name: 'Phòng Nhân sự & Văn hóa', parentId: deptBod.id, status: Status.ACTIVE },
    });

    console.log('   ✅ Đã thiết lập 8 phòng ban liên kết cha - con.');

    // =========================================================================
    // 3. KHỞI TẠO 12 NHÂN SỰ & GÁN VAI TRÒ
    // =========================================================================
    console.log('👥 3. Khởi tạo 12 Nhân sự & Gán vai trò...');

    const roleSuperAdmin = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
    const roleManager = await prisma.role.findUnique({ where: { code: 'MANAGER' } });
    const roleEmployee = await prisma.role.findUnique({ where: { code: 'EMPLOYEE' } });
    const roleChampion = await prisma.role.findUnique({ where: { code: 'OKR_CHAMPION' } });
    const roleViewer = await prisma.role.findUnique({ where: { code: 'VIEWER' } });

    // 1. CEO: Trần Văn Long
    const userCeo = await prisma.user.upsert({
      where: { email: 'ceo@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptBod.id },
      create: {
        email: 'ceo@example.com',
        password: defaultPasswordHash,
        fullName: 'Trần Văn Long',
        jobTitle: 'Chief Executive Officer (CEO)',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        departmentId: deptBod.id,
        status: Status.ACTIVE,
      },
    });
    if (roleSuperAdmin) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: userCeo.id, roleId: roleSuperAdmin.id } },
        update: {},
        create: { userId: userCeo.id, roleId: roleSuperAdmin.id },
      });
    }

    // 2. CTO: Nguyễn Minh Tuấn
    const userCto = await prisma.user.upsert({
      where: { email: 'cto@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptTech.id, managerId: userCeo.id },
      create: {
        email: 'cto@example.com',
        password: defaultPasswordHash,
        fullName: 'Nguyễn Minh Tuấn',
        jobTitle: 'Chief Technology Officer (CTO)',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        departmentId: deptTech.id,
        managerId: userCeo.id,
        status: Status.ACTIVE,
      },
    });
    if (roleManager && roleChampion) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userCto.id, roleId: roleManager.id } }, update: {}, create: { userId: userCto.id, roleId: roleManager.id } });
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userCto.id, roleId: roleChampion.id } }, update: {}, create: { userId: userCto.id, roleId: roleChampion.id } });
    }

    // 3. Lead Dev: Lê Hoàng Nam
    const userLeadDev = await prisma.user.upsert({
      where: { email: 'lead.dev@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptSoftware.id, managerId: userCto.id },
      create: {
        email: 'lead.dev@example.com',
        password: defaultPasswordHash,
        fullName: 'Lê Hoàng Nam',
        jobTitle: 'Engineering Lead',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        departmentId: deptSoftware.id,
        managerId: userCto.id,
        status: Status.ACTIVE,
      },
    });
    if (roleManager) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userLeadDev.id, roleId: roleManager.id } }, update: {}, create: { userId: userLeadDev.id, roleId: roleManager.id } });
    }

    // 4. Senior Backend: Phạm Quốc Bảo
    const userSeniorDev = await prisma.user.upsert({
      where: { email: 'dev.senior@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptSoftware.id, managerId: userLeadDev.id },
      create: {
        email: 'dev.senior@example.com',
        password: defaultPasswordHash,
        fullName: 'Phạm Quốc Bảo',
        jobTitle: 'Senior Backend Engineer',
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        departmentId: deptSoftware.id,
        managerId: userLeadDev.id,
        status: Status.ACTIVE,
      },
    });
    if (roleEmployee) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userSeniorDev.id, roleId: roleEmployee.id } }, update: {}, create: { userId: userSeniorDev.id, roleId: roleEmployee.id } });
    }

    // 5. Frontend Dev: Đặng Thị Mai
    const userFrontendDev = await prisma.user.upsert({
      where: { email: 'dev.frontend@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptSoftware.id, managerId: userLeadDev.id },
      create: {
        email: 'dev.frontend@example.com',
        password: defaultPasswordHash,
        fullName: 'Đặng Thị Mai',
        jobTitle: 'Frontend Developer',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        departmentId: deptSoftware.id,
        managerId: userLeadDev.id,
        status: Status.ACTIVE,
      },
    });
    if (roleEmployee) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userFrontendDev.id, roleId: roleEmployee.id } }, update: {}, create: { userId: userFrontendDev.id, roleId: roleEmployee.id } });
    }

    // 6. QA Lead: Ngô Văn Hùng
    const userQaLead = await prisma.user.upsert({
      where: { email: 'qa.lead@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptQA.id, managerId: userCto.id },
      create: {
        email: 'qa.lead@example.com',
        password: defaultPasswordHash,
        fullName: 'Ngô Văn Hùng',
        jobTitle: 'QA & Testing Lead',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        departmentId: deptQA.id,
        managerId: userCto.id,
        status: Status.ACTIVE,
      },
    });
    if (roleManager) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userQaLead.id, roleId: roleManager.id } }, update: {}, create: { userId: userQaLead.id, roleId: roleManager.id } });
    }

    // 7. Sales Director: Vũ Đức Thắng
    const userSalesLead = await prisma.user.upsert({
      where: { email: 'sales.lead@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptSalesB2B.id, managerId: userCeo.id },
      create: {
        email: 'sales.lead@example.com',
        password: defaultPasswordHash,
        fullName: 'Vũ Đức Thắng',
        jobTitle: 'Head of Enterprise Sales',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        departmentId: deptSalesB2B.id,
        managerId: userCeo.id,
        status: Status.ACTIVE,
      },
    });
    if (roleManager) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userSalesLead.id, roleId: roleManager.id } }, update: {}, create: { userId: userSalesLead.id, roleId: roleManager.id } });
    }

    // 8. Sales Specialist: Hoàng Thu Trang
    const userSalesExec = await prisma.user.upsert({
      where: { email: 'sales.exec@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptSalesB2B.id, managerId: userSalesLead.id },
      create: {
        email: 'sales.exec@example.com',
        password: defaultPasswordHash,
        fullName: 'Hoàng Thu Trang',
        jobTitle: 'B2B Sales Specialist',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        departmentId: deptSalesB2B.id,
        managerId: userSalesLead.id,
        status: Status.ACTIVE,
      },
    });
    if (roleEmployee) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userSalesExec.id, roleId: roleEmployee.id } }, update: {}, create: { userId: userSalesExec.id, roleId: roleEmployee.id } });
    }

    // 9. Marketing Lead: Lý Gia Huy
    const userMktLead = await prisma.user.upsert({
      where: { email: 'mkt.lead@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptMarketing.id, managerId: userSalesLead.id },
      create: {
        email: 'mkt.lead@example.com',
        password: defaultPasswordHash,
        fullName: 'Lý Gia Huy',
        jobTitle: 'Digital Marketing Lead',
        avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
        departmentId: deptMarketing.id,
        managerId: userSalesLead.id,
        status: Status.ACTIVE,
      },
    });
    if (roleManager) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userMktLead.id, roleId: roleManager.id } }, update: {}, create: { userId: userMktLead.id, roleId: roleManager.id } });
    }

    // 10. HR Manager: Nguyễn Bích Ngọc
    const userHrLead = await prisma.user.upsert({
      where: { email: 'hr.lead@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptHR.id, managerId: userCeo.id },
      create: {
        email: 'hr.lead@example.com',
        password: defaultPasswordHash,
        fullName: 'Nguyễn Bích Ngọc',
        jobTitle: 'HR & Culture Manager',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
        departmentId: deptHR.id,
        managerId: userCeo.id,
        status: Status.ACTIVE,
      },
    });
    if (roleManager && roleChampion) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userHrLead.id, roleId: roleManager.id } }, update: {}, create: { userId: userHrLead.id, roleId: roleManager.id } });
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userHrLead.id, roleId: roleChampion.id } }, update: {}, create: { userId: userHrLead.id, roleId: roleChampion.id } });
    }

    // 11. HR Specialist: Trần Phương Linh
    const userHrSpecialist = await prisma.user.upsert({
      where: { email: 'hr.specialist@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptHR.id, managerId: userHrLead.id },
      create: {
        email: 'hr.specialist@example.com',
        password: defaultPasswordHash,
        fullName: 'Trần Phương Linh',
        jobTitle: 'People & OKR Specialist',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        departmentId: deptHR.id,
        managerId: userHrLead.id,
        status: Status.ACTIVE,
      },
    });
    if (roleEmployee) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userHrSpecialist.id, roleId: roleEmployee.id } }, update: {}, create: { userId: userHrSpecialist.id, roleId: roleEmployee.id } });
    }

    // 12. Auditor / Viewer: Bùi Anh Dũng
    const userViewer = await prisma.user.upsert({
      where: { email: 'viewer@example.com' },
      update: { password: defaultPasswordHash, departmentId: deptBod.id, managerId: userCeo.id },
      create: {
        email: 'viewer@example.com',
        password: defaultPasswordHash,
        fullName: 'Bùi Anh Dũng',
        jobTitle: 'Board Advisor / Observer',
        avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
        departmentId: deptBod.id,
        managerId: userCeo.id,
        status: Status.ACTIVE,
      },
    });
    if (roleViewer) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userViewer.id, roleId: roleViewer.id } }, update: {}, create: { userId: userViewer.id, roleId: roleViewer.id } });
    }

    // Gán Manager cho các Phòng ban
    await prisma.department.update({ where: { id: deptBod.id }, data: { managerId: userCeo.id } });
    await prisma.department.update({ where: { id: deptTech.id }, data: { managerId: userCto.id } });
    await prisma.department.update({ where: { id: deptSoftware.id }, data: { managerId: userLeadDev.id } });
    await prisma.department.update({ where: { id: deptQA.id }, data: { managerId: userQaLead.id } });
    await prisma.department.update({ where: { id: deptBusiness.id }, data: { managerId: userSalesLead.id } });
    await prisma.department.update({ where: { id: deptSalesB2B.id }, data: { managerId: userSalesLead.id } });
    await prisma.department.update({ where: { id: deptMarketing.id }, data: { managerId: userMktLead.id } });
    await prisma.department.update({ where: { id: deptHR.id }, data: { managerId: userHrLead.id } });

    console.log('   ✅ Đã khởi tạo 12 nhân sự mẫu.');

    // =========================================================================
    // 4. KHỞI TẠO HỆ THỐNG OKRS ĐA CẤP ĐỘ QUÝ 3
    // =========================================================================
    console.log('🎯 4. Khởi tạo Mục tiêu OKRs Đa cấp độ (Company, Department, Individual)...');

    // Xóa OKRs cũ trong Q3 nếu cần làm mới
    const oldObjectives = await prisma.objective.findMany({ where: { cycleId: cycleQ3.id } });
    for (const obj of oldObjectives) {
      await prisma.objectiveAlignment.deleteMany({
        where: { OR: [{ alignedFromObjId: obj.id }, { alignedToObjId: obj.id }] },
      });
      const krs = await prisma.keyResult.findMany({ where: { objectiveId: obj.id } });
      for (const kr of krs) {
        await prisma.checkIn.deleteMany({ where: { krId: kr.id } });
      }
      await prisma.keyResult.deleteMany({ where: { objectiveId: obj.id } });
      await prisma.objective.delete({ where: { id: obj.id } });
    }

    // --- 1. COMPANY OKR 1: Tăng trưởng Doanh thu & Nền tảng Công nghệ ---
    const objCompany1 = await prisma.objective.create({
      data: {
        title: 'Tăng tốc độ tăng trưởng doanh thu B2B và nâng cao chất lượng nền tảng công nghệ trong Quý 3',
        description: 'Mở rộng thị phần doanh nghiệp khối tài chính ngân hàng, duy trì hạ tầng lõi SLA 99.95% và chuẩn hóa check-in.',
        level: ObjectiveLevel.COMPANY,
        cycleId: cycleQ3.id,
        departmentId: deptBod.id,
        ownerId: userCeo.id,
        approverId: userCeo.id,
        confidenceScore: ConfidenceScore.HIGH,
        weight: new Prisma.Decimal(2.0),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(78.5),
      },
    });

    const krC1_1 = await prisma.keyResult.create({
      data: {
        objectiveId: objCompany1.id,
        title: 'Đạt tổng doanh thu hợp đồng ký mới tối thiểu 15 tỷ VNĐ trong Q3',
        ownerId: userSalesLead.id,
        unitType: UnitType.CURRENCY,
        unitLabel: 'tỷ VNĐ',
        startValue: new Prisma.Decimal(0),
        targetValue: new Prisma.Decimal(15),
        currentValue: new Prisma.Decimal(11.2),
        weight: new Prisma.Decimal(2.0),
      },
    });

    const krC1_2 = await prisma.keyResult.create({
      data: {
        objectiveId: objCompany1.id,
        title: 'Tối ưu hạ tầng đạt thời gian hoạt động Uptime 99.95% và độ trễ phản hồi API < 200ms',
        ownerId: userCto.id,
        unitType: UnitType.PERCENTAGE,
        unitLabel: '%',
        startValue: new Prisma.Decimal(98.0),
        targetValue: new Prisma.Decimal(99.95),
        currentValue: new Prisma.Decimal(99.85),
        weight: new Prisma.Decimal(1.5),
      },
    });

    // --- 2. COMPANY OKR 2: Phát triển Nhân tài & Trải nghiệm Khách hàng ---
    const objCompany2 = await prisma.objective.create({
      data: {
        title: 'Xây dựng đội ngũ nhân tài gắn kết và tối ưu hóa trải nghiệm khách hàng toàn diện trong Quý 3',
        description: 'Tuyển dụng nhân sự công nghệ chất lượng cao, đào tạo văn hóa OKRs và đạt chỉ số CSAT > 90%.',
        level: ObjectiveLevel.COMPANY,
        cycleId: cycleQ3.id,
        departmentId: deptBod.id,
        ownerId: userCeo.id,
        approverId: userCeo.id,
        confidenceScore: ConfidenceScore.HIGH,
        weight: new Prisma.Decimal(1.5),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(82.0),
      },
    });

    const krC2_1 = await prisma.keyResult.create({
      data: {
        objectiveId: objCompany2.id,
        title: 'Đạt mức độ hài lòng khách hàng doanh nghiệp (CSAT) trên 90%',
        ownerId: userSalesLead.id,
        unitType: UnitType.PERCENTAGE,
        unitLabel: '%',
        startValue: new Prisma.Decimal(75),
        targetValue: new Prisma.Decimal(90),
        currentValue: new Prisma.Decimal(87),
        weight: new Prisma.Decimal(1.5),
      },
    });

    const krC2_2 = await prisma.keyResult.create({
      data: {
        objectiveId: objCompany2.id,
        title: 'Duy trì tỷ lệ hoàn thành Check-in OKR định kỳ hàng tuần trên 95% toàn công ty',
        ownerId: userHrLead.id,
        unitType: UnitType.PERCENTAGE,
        unitLabel: '%',
        startValue: new Prisma.Decimal(60),
        targetValue: new Prisma.Decimal(95),
        currentValue: new Prisma.Decimal(91),
        weight: new Prisma.Decimal(1.0),
      },
    });

    // --- 3. DEPARTMENT OKR: KHỐI CÔNG NGHỆ (TECH DIVISION) ---
    const objTech = await prisma.objective.create({
      data: {
        title: 'Hiện đại hóa kiến trúc hệ thống Core, giảm tải độ trễ API và nâng cao độ ổn định',
        description: 'Tái cấu trúc module phân quyền động, áp dụng cache và nâng cao độ bao phủ kiểm thử tự động.',
        level: ObjectiveLevel.DEPARTMENT,
        cycleId: cycleQ3.id,
        departmentId: deptTech.id,
        ownerId: userCto.id,
        approverId: userCeo.id,
        confidenceScore: ConfidenceScore.HIGH,
        weight: new Prisma.Decimal(2.0),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(83.5),
      },
    });

    const krTech1 = await prisma.keyResult.create({
      data: {
        objectiveId: objTech.id,
        title: 'Giảm thời gian phản hồi API trung bình (p95 latency) từ 450ms xuống dưới 180ms',
        ownerId: userLeadDev.id,
        unitType: UnitType.NUMERIC,
        unitLabel: 'ms',
        startValue: new Prisma.Decimal(450),
        targetValue: new Prisma.Decimal(180),
        currentValue: new Prisma.Decimal(205),
        weight: new Prisma.Decimal(2.0),
      },
    });

    const krTech2 = await prisma.keyResult.create({
      data: {
        objectiveId: objTech.id,
        title: 'Triển khai hoàn tất 100% hệ thống Phân quyền động (Dynamic RBAC) trên NestJS',
        ownerId: userSeniorDev.id,
        unitType: UnitType.PERCENTAGE,
        unitLabel: '%',
        startValue: new Prisma.Decimal(0),
        targetValue: new Prisma.Decimal(100),
        currentValue: new Prisma.Decimal(100),
        weight: new Prisma.Decimal(1.5),
      },
    });

    // --- 4. DEPARTMENT OKR: PHÒNG QA & TESTING ---
    const objQA = await prisma.objective.create({
      data: {
        title: 'Tự động hóa quy trình kiểm thử chất lượng và giảm thiểu lỗi Production dưới 0.1%',
        description: 'Xây dựng bộ kiểm thử E2E, Load Testing và bảo mật API đảm bảo phát hành phần mềm an toàn.',
        level: ObjectiveLevel.DEPARTMENT,
        cycleId: cycleQ3.id,
        departmentId: deptQA.id,
        ownerId: userQaLead.id,
        approverId: userCto.id,
        confidenceScore: ConfidenceScore.HIGH,
        weight: new Prisma.Decimal(1.5),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(80.0),
      },
    });

    const krQA1 = await prisma.keyResult.create({
      data: {
        objectiveId: objQA.id,
        title: 'Tự động hóa 150 kịch bản kiểm thử API và luồng nghiệp vụ cốt lõi',
        ownerId: userQaLead.id,
        unitType: UnitType.NUMERIC,
        unitLabel: 'test cases',
        startValue: new Prisma.Decimal(20),
        targetValue: new Prisma.Decimal(150),
        currentValue: new Prisma.Decimal(130),
        weight: new Prisma.Decimal(1.5),
      },
    });

    const krQA2 = await prisma.keyResult.create({
      data: {
        objectiveId: objQA.id,
        title: 'Kiểm soát tỷ lệ lỗi phát sinh trên môi trường Production dưới 0.1%',
        ownerId: userQaLead.id,
        unitType: UnitType.PERCENTAGE,
        unitLabel: '%',
        startValue: new Prisma.Decimal(0.8),
        targetValue: new Prisma.Decimal(0.1),
        currentValue: new Prisma.Decimal(0.15),
        weight: new Prisma.Decimal(1.0),
      },
    });

    // --- 5. DEPARTMENT OKR: PHÒNG KINH DOANH B2B ---
    const objSales = await prisma.objective.create({
      data: {
        title: 'Mở rộng tệp khách hàng doanh nghiệp lớn và tối ưu hóa tỷ lệ chuyển đổi sales funnel',
        description: 'Tăng trưởng doanh số khách hàng tài chính, ngân hàng và bán lẻ quy mô lớn.',
        level: ObjectiveLevel.DEPARTMENT,
        cycleId: cycleQ3.id,
        departmentId: deptSalesB2B.id,
        ownerId: userSalesLead.id,
        approverId: userCeo.id,
        confidenceScore: ConfidenceScore.MEDIUM,
        weight: new Prisma.Decimal(2.0),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(70.0),
      },
    });

    const krSales1 = await prisma.keyResult.create({
      data: {
        objectiveId: objSales.id,
        title: 'Ký kết thành công 20 hợp đồng doanh nghiệp lớn (Enterprise Deals)',
        ownerId: userSalesLead.id,
        unitType: UnitType.NUMERIC,
        unitLabel: 'hợp đồng',
        startValue: new Prisma.Decimal(0),
        targetValue: new Prisma.Decimal(20),
        currentValue: new Prisma.Decimal(14),
        weight: new Prisma.Decimal(2.0),
      },
    });

    const krSales2 = await prisma.keyResult.create({
      data: {
        objectiveId: objSales.id,
        title: 'Nâng cao tỷ lệ chốt sales (Win Rate) từ 18% lên 30%',
        ownerId: userSalesExec.id,
        unitType: UnitType.PERCENTAGE,
        unitLabel: '%',
        startValue: new Prisma.Decimal(18),
        targetValue: new Prisma.Decimal(30),
        currentValue: new Prisma.Decimal(26),
        weight: new Prisma.Decimal(1.0),
      },
    });

    // --- 6. DEPARTMENT OKR: PHÒNG MARKETING ---
    const objMkt = await prisma.objective.create({
      data: {
        title: 'Bùng nổ chiến dịch Inbound Marketing và thu hút 500 khách hàng tiềm năng chất lượng cao (MQLs)',
        description: 'Xây dựng chuỗi hội thảo chuyên đề OKRs và chiến dịch Digital Ads tối ưu chi phí CPL.',
        level: ObjectiveLevel.DEPARTMENT,
        cycleId: cycleQ3.id,
        departmentId: deptMarketing.id,
        ownerId: userMktLead.id,
        approverId: userSalesLead.id,
        confidenceScore: ConfidenceScore.HIGH,
        weight: new Prisma.Decimal(1.5),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(75.0),
      },
    });

    const krMkt1 = await prisma.keyResult.create({
      data: {
        objectiveId: objMkt.id,
        title: 'Thu hút 500 Marketing Qualified Leads (MQLs) từ các kênh số',
        ownerId: userMktLead.id,
        unitType: UnitType.NUMERIC,
        unitLabel: 'leads',
        startValue: new Prisma.Decimal(100),
        targetValue: new Prisma.Decimal(500),
        currentValue: new Prisma.Decimal(410),
        weight: new Prisma.Decimal(2.0),
      },
    });

    // --- 7. DEPARTMENT OKR: PHÒNG NHÂN SỰ & VĂN HÓA ---
    const objHR = await prisma.objective.create({
      data: {
        title: 'Chuẩn hóa quy trình Check-in OKRs toàn diện và triển khai chương trình phát triển nhân tài',
        description: 'Tổ chức các buổi workshop đào tạo kỹ năng thiết lập mục tiêu và đánh giá tiến độ.',
        level: ObjectiveLevel.DEPARTMENT,
        cycleId: cycleQ3.id,
        departmentId: deptHR.id,
        ownerId: userHrLead.id,
        approverId: userCeo.id,
        confidenceScore: ConfidenceScore.HIGH,
        weight: new Prisma.Decimal(1.5),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(88.0),
      },
    });

    const krHR1 = await prisma.keyResult.create({
      data: {
        objectiveId: objHR.id,
        title: 'Tổ chức 12 buổi đào tạo kỹ năng OKRs và Coaching cho đội ngũ quản lý',
        ownerId: userHrSpecialist.id,
        unitType: UnitType.NUMERIC,
        unitLabel: 'buổi workshop',
        startValue: new Prisma.Decimal(0),
        targetValue: new Prisma.Decimal(12),
        currentValue: new Prisma.Decimal(11),
        weight: new Prisma.Decimal(1.5),
      },
    });

    // --- 8. INDIVIDUAL OKR: SENIOR BACKEND (PHẠM QUỐC BẢO) ---
    const objDevBao = await prisma.objective.create({
      data: {
        title: 'Triển khai phân quyền động Real-time RBAC và tối ưu hiệu năng cơ sở dữ liệu',
        description: 'Bảo mật các route API bằng PermissionsGuard và bổ sung B-Tree Composite Indexes.',
        level: ObjectiveLevel.INDIVIDUAL,
        cycleId: cycleQ3.id,
        departmentId: deptSoftware.id,
        ownerId: userSeniorDev.id,
        approverId: userLeadDev.id,
        confidenceScore: ConfidenceScore.HIGH,
        weight: new Prisma.Decimal(1.0),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(92.0),
      },
    });

    const krBao1 = await prisma.keyResult.create({
      data: {
        objectiveId: objDevBao.id,
        title: 'Hoàn thiện 100% các API Phân quyền ma trận và Guards',
        ownerId: userSeniorDev.id,
        unitType: UnitType.PERCENTAGE,
        unitLabel: '%',
        startValue: new Prisma.Decimal(0),
        targetValue: new Prisma.Decimal(100),
        currentValue: new Prisma.Decimal(100),
        weight: new Prisma.Decimal(1.5),
      },
    });

    const krBao2 = await prisma.keyResult.create({
      data: {
        objectiveId: objDevBao.id,
        title: 'Tối ưu 25 truy vấn chậm và bổ sung đầy đủ B-Tree Composite Indexes',
        ownerId: userSeniorDev.id,
        unitType: UnitType.NUMERIC,
        unitLabel: 'queries',
        startValue: new Prisma.Decimal(0),
        targetValue: new Prisma.Decimal(25),
        currentValue: new Prisma.Decimal(22),
        weight: new Prisma.Decimal(1.0),
      },
    });

    // --- 9. INDIVIDUAL OKR: SALES SPECIALIST (HOÀNG THU TRANG) ---
    const objSalesTrang = await prisma.objective.create({
      data: {
        title: 'Chinh phục mục tiêu doanh số cá nhân tại thị trường khối tài chính ngân hàng',
        description: 'Tiếp cận các ngân hàng thương mại và công ty chứng khoán hàng đầu.',
        level: ObjectiveLevel.INDIVIDUAL,
        cycleId: cycleQ3.id,
        departmentId: deptSalesB2B.id,
        ownerId: userSalesExec.id,
        approverId: userSalesLead.id,
        confidenceScore: ConfidenceScore.MEDIUM,
        weight: new Prisma.Decimal(1.0),
        status: Status.APPROVED,
        progressPercentage: new Prisma.Decimal(70.0),
      },
    });

    const krTrang1 = await prisma.keyResult.create({
      data: {
        objectiveId: objSalesTrang.id,
        title: 'Đạt doanh số ký mới 5 tỷ VNĐ trong Q3',
        ownerId: userSalesExec.id,
        unitType: UnitType.CURRENCY,
        unitLabel: 'tỷ VNĐ',
        startValue: new Prisma.Decimal(0),
        targetValue: new Prisma.Decimal(5),
        currentValue: new Prisma.Decimal(3.5),
        weight: new Prisma.Decimal(2.0),
      },
    });

    // --- 10. INDIVIDUAL OKR: FRONTEND DEV (ĐẶNG THỊ MAI) - PENDING DUYỆT ---
    const objMaiFrontend = await prisma.objective.create({
      data: {
        title: 'Xây dựng thư viện UI Component Design System cho giao diện OKR Dashboard',
        description: 'Chuẩn hóa thiết kế giao diện, tối ưu trải nghiệm người dùng và đạt điểm Core Web Vitals > 90.',
        level: ObjectiveLevel.INDIVIDUAL,
        cycleId: cycleQ3.id,
        departmentId: deptSoftware.id,
        ownerId: userFrontendDev.id,
        approverId: userLeadDev.id,
        confidenceScore: ConfidenceScore.HIGH,
        weight: new Prisma.Decimal(1.0),
        status: Status.PENDING, // PENDING để Quản lý duyệt
        progressPercentage: new Prisma.Decimal(35.0),
      },
    });

    const krMai1 = await prisma.keyResult.create({
      data: {
        objectiveId: objMaiFrontend.id,
        title: 'Xây dựng 40 UI components dùng chung chuẩn Tailwind và Accessibility',
        ownerId: userFrontendDev.id,
        unitType: UnitType.NUMERIC,
        unitLabel: 'components',
        startValue: new Prisma.Decimal(0),
        targetValue: new Prisma.Decimal(40),
        currentValue: new Prisma.Decimal(14),
        weight: new Prisma.Decimal(1.5),
      },
    });

    console.log('   ✅ Đã tạo 10 Mục tiêu OKRs hoàn chỉnh đa cấp độ.');

    // =========================================================================
    // 5. THIẾT LẬP HỆ THỐNG GIÓNG HÀNG ĐA CHIỀU (VERTICAL & CROSS ALIGNMENTS)
    // =========================================================================
    console.log('🔗 5. Thiết lập Hệ thống Gióng hàng đa cấp độ (Alignments)...');

    // 1. Tech Dept -> Company 1 (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objTech.id, alignedToObjId: objCompany1.id, alignmentType: AlignmentType.VERTICAL } });
    
    // 2. QA Dept -> Tech Dept (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objQA.id, alignedToObjId: objTech.id, alignmentType: AlignmentType.VERTICAL } });

    // 3. QA Dept -> Company 1 (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objQA.id, alignedToObjId: objCompany1.id, alignmentType: AlignmentType.VERTICAL } });

    // 4. Sales Dept -> Company 1 (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objSales.id, alignedToObjId: objCompany1.id, alignmentType: AlignmentType.VERTICAL } });

    // 5. Marketing Dept -> Sales Dept (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objMkt.id, alignedToObjId: objSales.id, alignmentType: AlignmentType.VERTICAL } });

    // 6. HR Dept -> Company 2 (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objHR.id, alignedToObjId: objCompany2.id, alignmentType: AlignmentType.VERTICAL } });

    // 7. Dev Bảo -> Tech Dept (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objDevBao.id, alignedToObjId: objTech.id, alignmentType: AlignmentType.VERTICAL } });

    // 8. Sales Trang -> Sales Dept (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objSalesTrang.id, alignedToObjId: objSales.id, alignmentType: AlignmentType.VERTICAL } });

    // 9. Frontend Mai -> Tech Dept (Vertical)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objMaiFrontend.id, alignedToObjId: objTech.id, alignmentType: AlignmentType.VERTICAL } });

    // 🌟 GIÓNG HÀNG CHÉO (CROSS-FUNCTIONAL ALIGNMENTS) 🌟
    // 10. Sales Trang -> Tech Dept (Cross: Phối hợp demo giải pháp công nghệ mới cho khách hàng B2B)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objSalesTrang.id, alignedToObjId: objTech.id, alignmentType: AlignmentType.CROSS } });
    await prisma.objective.update({ where: { id: objSalesTrang.id }, data: { isAlignedCross: true } });

    // 11. Marketing Dept -> Tech Dept (Cross: Marketing phối hợp cùng Tech làm Landing Page & Webinar)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objMkt.id, alignedToObjId: objTech.id, alignmentType: AlignmentType.CROSS } });
    await prisma.objective.update({ where: { id: objMkt.id }, data: { isAlignedCross: true } });

    // 12. Dev Bảo -> QA Dept (Cross: Backend phối hợp QA tự động hóa API testing)
    await prisma.objectiveAlignment.create({ data: { alignedFromObjId: objDevBao.id, alignedToObjId: objQA.id, alignmentType: AlignmentType.CROSS } });
    await prisma.objective.update({ where: { id: objDevBao.id }, data: { isAlignedCross: true } });

    console.log('   ✅ Đã thiết lập 12 liên kết gióng hàng (9 Dọc Vertical, 3 Chéo Cross).');

    // =========================================================================
    // 6. TẠO DÒNG THỜI GIAN NHẬT KÝ CHECK-INS (TIMELINE AUDIT LOG)
    // =========================================================================
    console.log('📝 6. Khởi tạo Nhật ký Check-ins Đa dạng (Timeline Audit Log)...');

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // --- TIMELINE CHO KR 1 CỦA DEV BẢO (3 lần check-in liên tiếp) ---
    // Tuần 2 (40 ngày trước)
    await prisma.checkIn.create({
      data: {
        krId: krBao1.id,
        createdBy: userSeniorDev.id,
        oldValue: new Prisma.Decimal(0),
        newValue: new Prisma.Decimal(40),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Đã hoàn thành thiết kế 5 bảng RBAC và viết xong RolesService cơ bản.',
        status: Status.APPROVED,
        reviewerId: userLeadDev.id,
        reviewerFeedback: 'Tiến độ rất tốt, chú ý index cho các bảng trung gian nhé.',
        approvedDoneAt: new Date(now - 40 * oneDay),
        createdAt: new Date(now - 40 * oneDay),
      },
    });

    // Tuần 5 (25 ngày trước)
    await prisma.checkIn.create({
      data: {
        krId: krBao1.id,
        createdBy: userSeniorDev.id,
        oldValue: new Prisma.Decimal(40),
        newValue: new Prisma.Decimal(75),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Đã tích hợp xong PermissionsGuard và decorator @RequirePermissions cho toàn bộ modules.',
        status: Status.APPROVED,
        reviewerId: userLeadDev.id,
        reviewerFeedback: 'Tuyệt vời em! Hãy tiếp tục viết test suite cho PermissionsGuard.',
        approvedDoneAt: new Date(now - 25 * oneDay),
        createdAt: new Date(now - 25 * oneDay),
      },
    });

    // Tuần 8 (5 ngày trước) -> Hoàn thành 100%
    await prisma.checkIn.create({
      data: {
        krId: krBao1.id,
        createdBy: userSeniorDev.id,
        oldValue: new Prisma.Decimal(75),
        newValue: new Prisma.Decimal(100),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Đã hoàn thành 100% các API RBAC ma trận và bộ kiểm thử Unit Test đạt 25/25 passed.',
        status: Status.APPROVED,
        reviewerId: userLeadDev.id,
        reviewerFeedback: 'Chúc mừng Bảo đã hoàn thành mục tiêu KR này vượt tiến độ!',
        approvedDoneAt: new Date(now - 5 * oneDay),
        createdAt: new Date(now - 5 * oneDay),
      },
    });

    // --- TIMELINE CHO KR 2 CỦA DEV BẢO (Check-in PENDING chờ duyệt) ---
    // Check-in cũ đã duyệt (10 ngày trước)
    await prisma.checkIn.create({
      data: {
        krId: krBao2.id,
        createdBy: userSeniorDev.id,
        oldValue: new Prisma.Decimal(0),
        newValue: new Prisma.Decimal(15),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Đã tối ưu 15 query chậm trong module Objectives và User Roles.',
        status: Status.APPROVED,
        reviewerId: userLeadDev.id,
        reviewerFeedback: 'Rất hữu ích, tốc độ query đã cải thiện rõ rệt.',
        approvedDoneAt: new Date(now - 10 * oneDay),
        createdAt: new Date(now - 10 * oneDay),
      },
    });

    // Check-in MỚI NHẤT -> PENDING CHỜ LEAD DEV DUYỆT
    await prisma.checkIn.create({
      data: {
        krId: krBao2.id,
        createdBy: userSeniorDev.id,
        oldValue: new Prisma.Decimal(15),
        newValue: new Prisma.Decimal(22),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Đã index bổ sung cho bảng check_ins, objectives và user_roles. Thời gian query trung bình giảm còn 35ms.',
        blocker: 'Cần Lead duyệt để deploy migration lên cụm Staging/Production.',
        status: Status.PENDING, // 🎯 PENDING CHO LEAD DEV DUYỆT
        reviewerId: userLeadDev.id,
        createdAt: new Date(now - 1 * oneDay),
      },
    });

    // --- TIMELINE CHO KR CỦA FRONTEND MAI (Check-in PENDING chờ duyệt) ---
    await prisma.checkIn.create({
      data: {
        krId: krMai1.id,
        createdBy: userFrontendDev.id,
        oldValue: new Prisma.Decimal(0),
        newValue: new Prisma.Decimal(14),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Đã hoàn thành các component Progress Bar, Modal Duyệt OKRs và Bảng ma trận checkbox.',
        blocker: 'Cần đội Backend cung cấp thêm swagger spec hoàn chỉnh.',
        status: Status.PENDING, // 🎯 PENDING CHO LEAD DEV DUYỆT
        reviewerId: userLeadDev.id,
        createdAt: new Date(),
      },
    });

    // --- TIMELINE CHO KR CỦA SALES TRANG (Check-in có REJECTED để test kịch bản từ chối) ---
    // Check-in tuần 4 (Đã duyệt)
    await prisma.checkIn.create({
      data: {
        krId: krTrang1.id,
        createdBy: userSalesExec.id,
        oldValue: new Prisma.Decimal(0),
        newValue: new Prisma.Decimal(2.0),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Ký hợp đồng triển khai phần mềm cho 1 Công ty Chứng khoán trị giá 2 tỷ VNĐ.',
        status: Status.APPROVED,
        reviewerId: userSalesLead.id,
        reviewerFeedback: 'Khởi đầu quý rất tốt em nhé!',
        approvedDoneAt: new Date(now - 30 * oneDay),
        createdAt: new Date(now - 30 * oneDay),
      },
    });

    // Check-in tuần 7 (BỊ REJECTED ĐỂ TEST KỊCH BẢN TỪ CHỐI)
    await prisma.checkIn.create({
      data: {
        krId: krTrang1.id,
        createdBy: userSalesExec.id,
        oldValue: new Prisma.Decimal(2.0),
        newValue: new Prisma.Decimal(4.5),
        confidenceScore: ConfidenceScore.LOW,
        note: 'Dự kiến ký thêm 2.5 tỷ từ ngân hàng ACB.',
        blocker: 'Hợp đồng chưa chốt điều khoản bảo hành.',
        status: Status.REJECTED, // 🎯 TEST STATUS REJECTED
        reviewerId: userSalesLead.id,
        reviewerFeedback: 'Hợp đồng chưa ký chính thức thì chưa được ghi nhận vào doanh số thực tế em nhé. Vui lòng check-in lại sau khi có chữ ký.',
        approvedDoneAt: new Date(now - 14 * oneDay),
        createdAt: new Date(now - 14 * oneDay),
      },
    });

    // Check-in tuần 9 (ĐÃ DUYỆT sau khi bổ sung hợp đồng chính thức)
    await prisma.checkIn.create({
      data: {
        krId: krTrang1.id,
        createdBy: userSalesExec.id,
        oldValue: new Prisma.Decimal(2.0),
        newValue: new Prisma.Decimal(3.5),
        confidenceScore: ConfidenceScore.MEDIUM,
        note: 'Đã chính thức ký kết hợp đồng 1.5 tỷ VNĐ với Ngân hàng ACB kèm biên bản bàn giao giai đoạn 1.',
        status: Status.APPROVED,
        reviewerId: userSalesLead.id,
        reviewerFeedback: 'Đã xác nhận đầy đủ hồ sơ. Chúc mừng em!',
        approvedDoneAt: new Date(now - 3 * oneDay),
        createdAt: new Date(now - 3 * oneDay),
      },
    });

    // --- TIMELINE CHO MARKETING LEAD (Check-in PENDING gửi Sales Lead duyệt) ---
    await prisma.checkIn.create({
      data: {
        krId: krMkt1.id,
        createdBy: userMktLead.id,
        oldValue: new Prisma.Decimal(250),
        newValue: new Prisma.Decimal(410),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Chiến dịch Webinar "Quản trị OKRs trong Kỷ nguyên Số" thu hút hơn 300 CEO tham dự, mang lại 160 MQLs chất lượng.',
        blocker: 'Cần đội Sales phối hợp gọi điện chăm sóc ngay trong 48h để tối ưu tỷ lệ chuyển đổi.',
        status: Status.PENDING, // 🎯 PENDING CHO SALES LEAD DUYỆT
        reviewerId: userSalesLead.id,
        createdAt: new Date(),
      },
    });

    // --- TIMELINE CHO QA LEAD (Check-in PENDING gửi CTO duyệt) ---
    await prisma.checkIn.create({
      data: {
        krId: krQA1.id,
        createdBy: userQaLead.id,
        oldValue: new Prisma.Decimal(80),
        newValue: new Prisma.Decimal(130),
        confidenceScore: ConfidenceScore.HIGH,
        note: 'Đã hoàn thành 130 kịch bản test automation E2E trên Playwright và Jest.',
        blocker: null,
        status: Status.PENDING, // 🎯 PENDING CHO CTO DUYỆT
        reviewerId: userCto.id,
        createdAt: new Date(),
      },
    });

    console.log('   ✅ Đã tạo đầy đủ chuỗi Check-ins đa dạng (APPROVED, PENDING, REJECTED qua nhiều tuần).');

    console.log('\n================================================================');
    console.log('🎉 KHỞI TẠO DỮ LIỆU MẪU OKRS NÂNG CAO THÀNH CÔNG RỰC RỠ!');
    console.log('================================================================\n');

    console.log('🎯 TÓM TẮT DỮ LIỆU MẪU ĐÃ SẴN SÀNG ĐỂ TEST:');
    console.log('1. 📊 Cây Mục tiêu OKRs: 2 Company, 5 Department, 3 Individual (Đầy đủ 10 OKRs).');
    console.log('2. 🔗 Gióng hàng Đa chiều: 9 liên kết Dọc (Vertical) + 3 liên kết Chéo (Cross-functional).');
    console.log('3. 📝 Lịch sử Check-ins:');
    console.log('   - 5 Check-ins đã APPROVED qua nhiều tuần (tạo đồ thị tiến độ lịch sử).');
    console.log('   - 4 Check-ins đang PENDING chờ Quản lý duyệt:');
    console.log('     * 2 bản gửi cho Lead Dev (lead.dev@example.com)');
    console.log('     * 1 bản gửi cho Sales Lead (sales.lead@example.com)');
    console.log('     * 1 bản gửi cho CTO (cto@example.com)');
    console.log('   - 1 Check-in REJECTED (kèm feedback từ chối thực tế).');
    console.log('\n🔑 Mật khẩu chung tất cả tài khoản: Password@123\n');
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo dữ liệu mẫu:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
