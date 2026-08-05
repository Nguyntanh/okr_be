/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `permissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `permissions` ADD COLUMN `code` VARCHAR(100) NOT NULL,
    ADD COLUMN `module` VARCHAR(50) NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE `roles` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `is_system` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `permissions_code_key` ON `permissions`(`code`);

-- CreateIndex
CREATE INDEX `idx_permission_code` ON `permissions`(`code`);

-- CreateIndex
CREATE INDEX `idx_permission_module` ON `permissions`(`module`);

-- CreateIndex
CREATE INDEX `idx_token_cleanup` ON `refresh_tokens`(`expires_at`, `is_revoked`);

-- CreateIndex
CREATE INDEX `idx_role_code` ON `roles`(`code`);

-- CreateIndex
CREATE INDEX `idx_user_status` ON `users`(`status`);

-- RenameIndex
ALTER TABLE `check_ins` RENAME INDEX `check_ins_created_by_fkey` TO `idx_checkin_creator`;

-- RenameIndex
ALTER TABLE `check_ins` RENAME INDEX `check_ins_reviewer_id_fkey` TO `idx_checkin_reviewer`;

-- RenameIndex
ALTER TABLE `cycles` RENAME INDEX `cycles_created_by_fkey` TO `idx_cycle_created_by`;

-- RenameIndex
ALTER TABLE `departments` RENAME INDEX `departments_manager_id_fkey` TO `idx_dept_manager`;

-- RenameIndex
ALTER TABLE `objective_alignments` RENAME INDEX `objective_alignments_aligned_to_obj_id_fkey` TO `idx_alignment_to_obj`;

-- RenameIndex
ALTER TABLE `objectives` RENAME INDEX `objectives_approver_id_fkey` TO `idx_obj_approver`;

-- RenameIndex
ALTER TABLE `refresh_tokens` RENAME INDEX `refresh_tokens_user_id_idx` TO `idx_token_user_id`;

-- RenameIndex
ALTER TABLE `role_permissions` RENAME INDEX `role_permissions_permission_id_fkey` TO `idx_role_permission_perm_id`;

-- RenameIndex
ALTER TABLE `user_roles` RENAME INDEX `user_roles_role_id_fkey` TO `idx_user_role_role_id`;

-- RenameIndex
ALTER TABLE `users` RENAME INDEX `users_manager_id_fkey` TO `idx_user_manager`;
