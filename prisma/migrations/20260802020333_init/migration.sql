-- CreateTable
CREATE TABLE `departments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `parent_id` BIGINT NULL,
    `manager_id` BIGINT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_dept_status`(`status`),
    INDEX `idx_dept_parent`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `avatar_url` VARCHAR(550) NULL,
    `job_title` VARCHAR(100) NULL,
    `role` ENUM('SUPER_ADMIN', 'OKR_CHAMPION', 'MANAGER', 'EMPLOYEE', 'VIEWER') NOT NULL DEFAULT 'EMPLOYEE',
    `department_id` BIGINT NULL,
    `manager_id` BIGINT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_user_role`(`role`),
    INDEX `idx_user_dept`(`department_id`),
    INDEX `idx_user_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cycles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `type` ENUM('ANNUAL', 'QUARTERLY') NOT NULL DEFAULT 'QUARTERLY',
    `parent_id` BIGINT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `cycles_code_key`(`code`),
    INDEX `idx_cycle_status_dates`(`status`, `start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `objectives` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `level` ENUM('COMPANY', 'DEPARTMENT', 'INDIVIDUAL') NOT NULL,
    `cycle_id` BIGINT NOT NULL,
    `department_id` BIGINT NULL,
    `owner_id` BIGINT NOT NULL,
    `approver_id` BIGINT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `progress_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `confidence_score` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `weight` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    `is_aligned_cross` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_obj_cycle_dept`(`cycle_id`, `department_id`),
    INDEX `idx_obj_owner`(`owner_id`),
    INDEX `idx_obj_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `objective_alignments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `aligned_from_obj_id` BIGINT NOT NULL,
    `aligned_to_obj_id` BIGINT NOT NULL,
    `alignment_type` ENUM('VERTICAL', 'CROSS') NOT NULL DEFAULT 'VERTICAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_alignment_pair`(`aligned_from_obj_id`, `aligned_to_obj_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `key_results` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `objective_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `owner_id` BIGINT NOT NULL,
    `unit_type` ENUM('PERCENTAGE', 'CURRENCY', 'NUMERIC', 'BOOLEAN') NOT NULL DEFAULT 'NUMERIC',
    `unit_label` VARCHAR(50) NULL,
    `start_value` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `target_value` DECIMAL(15, 2) NOT NULL,
    `current_value` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `weight` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_kr_objective`(`objective_id`),
    INDEX `idx_kr_owner`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `check_ins` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `kr_id` BIGINT NOT NULL,
    `created_by` BIGINT NOT NULL,
    `old_value` DECIMAL(15, 2) NOT NULL,
    `new_value` DECIMAL(15, 2) NOT NULL,
    `confidence_score` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `note` TEXT NULL,
    `blocker` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'APPROVED',
    `reviewer_id` BIGINT NULL,
    `reviewer_feedback` TEXT NULL,
    `approved_done_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_checkin_kr_created`(`kr_id`, `created_at` DESC),
    INDEX `idx_checkin_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycles` ADD CONSTRAINT `cycles_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `cycles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycles` ADD CONSTRAINT `cycles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objectives` ADD CONSTRAINT `objectives_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objectives` ADD CONSTRAINT `objectives_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objectives` ADD CONSTRAINT `objectives_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objectives` ADD CONSTRAINT `objectives_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objective_alignments` ADD CONSTRAINT `objective_alignments_aligned_from_obj_id_fkey` FOREIGN KEY (`aligned_from_obj_id`) REFERENCES `objectives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objective_alignments` ADD CONSTRAINT `objective_alignments_aligned_to_obj_id_fkey` FOREIGN KEY (`aligned_to_obj_id`) REFERENCES `objectives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `key_results` ADD CONSTRAINT `key_results_objective_id_fkey` FOREIGN KEY (`objective_id`) REFERENCES `objectives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `key_results` ADD CONSTRAINT `key_results_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_kr_id_fkey` FOREIGN KEY (`kr_id`) REFERENCES `key_results`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
