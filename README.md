# OKR Enterprise Backend API

Hệ thống Backend API Quản lý Mục tiêu và Kết quả Then chốt (**Objectives and Key Results - OKRs**) cho doanh nghiệp, được xây dựng với **NestJS 10**, **Prisma ORM**, **MySQL / MariaDB**, kiến trúc phân quyền động **Dynamic RBAC (5-Table Architecture)** và tài liệu tương tác **Swagger UI**.

---

## 1. Tổng quan hệ thống

Hệ thống cung cấp trọn vẹn 20/20 tính năng quản lý OKRs doanh nghiệp theo chuẩn thực tiễn:

- **Xác thực & Bảo mật**: Đăng nhập Email/Password, Access Token (JWT), Refresh Token Rotation lưu trong Cookie `HttpOnly`.
- **Bảng phân quyền động (Dynamic RBAC & Matrix)**: Quản lý Roles & Permissions theo thời gian thực từ Database, tự động bypass đối với `SUPER_ADMIN`, chặn truy cập bằng `PermissionsGuard`.
- **Cơ cấu tổ chức**: Quản lý phòng ban theo mô hình cây cha - con (Organization Tree), phân bổ Trưởng phòng (Manager) và thành viên.
- **Chu kỳ OKR (Cycles)**: Khởi tạo chu kỳ Năm / Quý, tự động xác định chu kỳ hiện tại, hỗ trợ **Khóa chu kỳ (`CLOSED`)** để đóng băng dữ liệu OKR và Check-in.
- **Mục tiêu (Objectives)**: Phân cấp Công ty (`COMPANY`), Phòng ban (`DEPARTMENT`), Cá nhân (`INDIVIDUAL`); quy trình phê duyệt (`DRAFT` $\rightarrow$ `PENDING` $\rightarrow$ `APPROVED` / `REJECTED`).
- **Kết quả then chốt (Key Results)**: Đo lường chỉ số đa dạng (`PERCENTAGE`, `CURRENCY`, `NUMERIC`, `BOOLEAN`), thiết lập giá trị bắt đầu, mục tiêu và trọng số (`weight`).
- **Tự động tính toán tiến độ (Weighted Progress)**: Tự động cập nhật % tiến độ tổng của Objective ngay khi Key Result thay đổi giá trị hoặc khi Check-in được duyệt.
- **Gióng hàng OKR (Alignments)**: Thiết lập liên kết gióng hàng chiến lược theo chiều dọc (`VERTICAL`) hoặc liên phòng ban (`CROSS`).
- **Check-in & Đánh giá (Check-ins & Reviews)**: Cập nhật tiến độ định kỳ, ghi nhận độ tự tin (`ConfidenceScore`), rào cản (`Blockers`), lịch sử Audit Log và màn hình duyệt Check-in dành cho Quản lý.

---

## 2. Bảng đối soát 20 Tính năng Nghiệp vụ

| STT | Tính năng | User Story | Module / Endpoint chính | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Đăng nhập Email/Password** | Đăng nhập bằng Email và Password lấy Token làm việc. | `POST /auth/login` (JWT + HttpOnly Cookie) | ✅ Hoàn thành |
| **2** | **Đăng xuất an toàn** | Đăng xuất, vô hiệu hóa Token và bảo vệ dữ liệu. | `POST /auth/logout` (Revoke Refresh Token) | ✅ Hoàn thành |
| **3** | **Khởi tạo User & gán Role** | Tạo tài khoản nhân sự và gán vai trò chặt chẽ. | `POST /users`, `PUT /users/:id/roles`, `RolesModule` | ✅ Hoàn thành |
| **4** | **Xem & Cập nhật Profile** | Cập nhật Avatar, Job Title nhận diện trong sơ đồ. | `GET /auth/profile`, `PUT /users/:id` | ✅ Hoàn thành |
| **5** | **Quản lý cấu trúc Phòng ban** | Tạo, sửa, xóa phòng ban cha/con, gán Trưởng phòng. | `GET /departments/tree`, `POST/PUT/DELETE /departments` | ✅ Hoàn thành |
| **6** | **Tạo chu kỳ OKR mới** | Khởi tạo chu kỳ theo Quý (QUARTERLY) hoặc Năm (ANNUAL). | `POST /cycles` (`title`, `code`, `startDate`, `endDate`) | ✅ Hoàn thành |
| **7** | **Khóa chu kỳ OKR (`CLOSED`)** | Khóa chu kỳ khi hết hạn để đóng băng dữ liệu OKR. | `PATCH /cycles/:id/status` (`status: CLOSED`) | ✅ Hoàn thành |
| **8** | **Xem danh sách & Chuyển Chu kỳ**| Xem danh sách chu kỳ và chuyển đổi theo dõi OKR. | `GET /cycles`, `GET /cycles/current` | ✅ Hoàn thành |
| **9** | **Khởi tạo & Thiết lập Mục tiêu** | Tạo OKR gắn với Chu kỳ, Phòng ban, Cấp độ. | `POST /objectives` (Gắn cycle, dept, owner, approver) | ✅ Hoàn thành |
| **10** | **Quản lý Trạng thái duyệt OKR** | Quản lý duyệt OKR (`DRAFT` $\rightarrow$ `PENDING` $\rightarrow$ `APPROVED`). | `PATCH /objectives/:id/status` | ✅ Hoàn thành |
| **11** | **Tự động tính Weighted Progress**| Tự động tính % tiến độ tổng hợp theo trọng số của KRs. | `ObjectivesService.recalculateProgress()` | ✅ Hoàn thành |
| **12** | **Khởi tạo & Cấu hình Key Result** | Tạo KR, đơn vị tính, giá trị bắt đầu/mục tiêu, trọng số. | `POST /objectives/:id/key-results`, `PUT /key-results/:id` | ✅ Hoàn thành |
| **13** | **Thiết lập liên kết Gióng hàng** | Gióng hàng OKR cấp trên (Vertical) hoặc chéo (Cross). | `POST /objectives/:id/alignments` (`VERTICAL`/`CROSS`) | ✅ Hoàn thành |
| **14** | **Thực hiện Check-in tiến độ** | Check-in tiến độ KR, điểm tự tin và khó khăn (blockers).| `POST /key-results/:krId/check-ins` | ✅ Hoàn thành |
| **15** | **Lịch sử Check-in (Audit Log)**| Xem toàn bộ lịch sử biến động tiến độ theo thời gian. | `GET /key-results/:krId/check-ins` | ✅ Hoàn thành |
| **16** | **Danh sách Check-in chờ duyệt** | Màn hình danh sách Check-in chờ Quản lý duyệt. | `GET /check-ins/pending-reviews` | ✅ Hoàn thành |
| **17** | **Phê duyệt / Từ chối Check-in** | Để lại feedback và duyệt/từ chối check-in cập nhật KR. | `PATCH /check-ins/:id/review` (`APPROVED`/`REJECTED`) | ✅ Hoàn thành |
| **18** | **Xem OKR cá nhân & phòng ban** | Lọc xem OKR cá nhân và phòng ban trong chu kỳ. | `GET /objectives?level=&departmentId=&mine=true` | ✅ Hoàn thành |
| **19** | **Tiến độ trực quan (Progress Bar)**| Dữ liệu `progressPercentage` & `confidenceScore` trực quan.| Tích hợp sẵn trong mọi endpoint trả về Objective | ✅ Hoàn thành |
| **20** | **Lọc OKR theo trạng thái duyệt** | Lọc OKR trên Dashboard theo trạng thái duyệt. | `GET /objectives?status=APPROVED,PENDING` | ✅ Hoàn thành |

---

## 3. Công nghệ sử dụng

- **Ngôn ngữ**: TypeScript / Node.js
- **Framework**: NestJS 10
- **Database & ORM**: MySQL / MariaDB + Prisma ORM (Client v7 với Driver Adapter `@prisma/adapter-mariadb`)
- **Xác thực & Mã hóa**: JWT (`@nestjs/jwt`), `bcrypt`, `cookie-parser`
- **Tài liệu API**: Swagger UI (`@nestjs/swagger`, `swagger-ui-dist`)
- **Kiểm thử**: Jest, Supertest (100% Passed)

---

## 4. Kiến trúc & Các Module API

```mermaid
flowchart TD
    subgraph Client [Frontend / API Consumer]
        App[Web Application / Admin Dashboard]
    end

    subgraph Guards [Bảo mật & Phân quyền]
        AuthGuard[AuthGuard - JWT Verification]
        PermGuard[PermissionsGuard - Realtime RBAC Check]
        BigIntInterceptor[TransformBigIntInterceptor]
    end

    subgraph Modules [Các Module Nghiệp vụ NestJS]
        AuthMod[AuthModule]
        UsersMod[UsersModule]
        RolesMod[RolesModule & PermissionsModule]
        DeptMod[DepartmentsModule]
        CyclesMod[CyclesModule]
        ObjMod[ObjectivesModule & KeyResultsModule]
        CheckInMod[CheckInsModule]
    end

    subgraph DB [Database Layer - Prisma]
        MySQL[(MySQL Database)]
    end

    App --> AuthGuard --> PermGuard --> BigIntInterceptor
    BigIntInterceptor --> Modules
    Modules --> MySQL
```

### 4.1 Auth Module (`/auth`)
- `POST /auth/login`: Đăng nhập với email và password, cấp Access Token và Refresh Token trong cookie HttpOnly.
- `POST /auth/refresh`: Làm mới Access Token dựa trên cookie refresh token (Token Rotation).
- `POST /auth/logout`: Đăng xuất tài khoản, thu hồi (revoke) token và xóa cookie.
- `GET /auth/profile`: Lấy thông tin tài khoản đang đăng nhập kèm toàn bộ vai trò (`roles`) và quyền hạn (`permissions`) để Frontend phân quyền hiển thị UI.

### 4.2 Users Module (`/users`)
- `GET /users`: Danh sách người dùng kèm phòng ban, quản lý và vai trò.
- `GET /users/:id`: Chi tiết người dùng.
- `POST /users`: Tạo mới tài khoản và gán vai trò ban đầu.
- `PUT /users/:id`: Cập nhật thông tin tài khoản.
- `PUT /users/:id/roles`: Gán vai trò cho người dùng (Dynamic Role Assignment).
- `GET /users/:id/permissions`: Tra cứu quyền hạn chi tiết của một tài khoản.

### 4.3 Roles & Permissions Module (`/roles`, `/permissions`)
- `GET /permissions`: Lấy danh sách 34 permissions gom nhóm theo 9 module (`users`, `roles`, `departments`, `cycles`, `objectives`, `key_results`, `alignments`, `checkins`, `reports`) phục vụ render Bảng ma trận phân quyền.
- `GET /permissions/matrix`: Lấy toàn bộ ma trận (Roles x Permissions).
- `GET /roles`: Lấy danh sách vai trò kèm số lượng user và permission.
- `GET /roles/:id`: Chi tiết vai trò và danh sách quyền.
- `POST /roles`: Tạo vai trò tùy chỉnh mới.
- `PUT /roles/:id`: Cập nhật tên/mô tả vai trò.
- `DELETE /roles/:id`: Xóa vai trò tùy chỉnh (khóa bảo vệ không cho xóa vai trò hệ thống `isSystem: true`).
- `GET /roles/:id/permissions`: Lấy danh sách quyền của vai trò.
- `PUT /roles/:id/permissions`: Cập nhật toàn bộ phân quyền cho vai trò từ Bảng phân quyền.

### 4.4 Departments Module (`/departments`)
- `GET /departments`: Lấy danh sách phẳng tất cả phòng ban kèm Manager và số lượng thành viên.
- `GET /departments/tree`: Lấy cấu trúc cây phân cấp phòng ban cha - con (Organization Tree).
- `GET /departments/:id`: Xem chi tiết phòng ban, thành viên và OKRs phòng ban.
- `POST /departments`: Tạo phòng ban mới (chọn cấp cha, gán Manager).
- `PUT /departments/:id`: Cập nhật phòng ban, đổi Manager hoặc chuyển cấp cha.
- `DELETE /departments/:id`: Xóa mềm phòng ban (kiểm tra ràng buộc phòng ban con).

### 4.5 Cycles Module (`/cycles`)
- `GET /cycles`: Lấy danh sách chu kỳ OKR (Quý/Năm), sắp xếp theo ngày mới nhất.
- `GET /cycles/current`: Lấy chu kỳ đang hoạt động (Active / Khớp ngày hôm nay).
- `GET /cycles/:id`: Xem chi tiết chu kỳ và thống kê số lượng Mục tiêu.
- `POST /cycles`: Tạo chu kỳ mới (Quý hoặc Năm).
- `PUT /cycles/:id`: Sửa thông tin chu kỳ.
- `PATCH /cycles/:id/status`: Khóa hoặc đổi trạng thái chu kỳ (`DRAFT`, `ACTIVE`, `CLOSED` - đóng băng dữ liệu OKR).
- `DELETE /cycles/:id`: Xóa chu kỳ (kiểm tra nếu chưa có Objective).

### 4.6 Objectives & Key Results Module (`/objectives`, `/key-results`)
- `GET /objectives`: Lọc danh sách Mục tiêu theo chu kỳ (`cycleId`), phòng ban (`departmentId`), người sở hữu (`ownerId`), cấp độ (`level`), trạng thái duyệt (`status`), hoặc OKR của tôi (`mine=true`).
- `GET /objectives/:id`: Chi tiết Mục tiêu kèm Key Results, Gióng hàng và Check-in.
- `POST /objectives`: Tạo Mục tiêu (gắn chu kỳ, phòng ban, độ tự tin, approver, đính kèm KR ban đầu).
- `PUT /objectives/:id`: Cập nhật Mục tiêu.
- `PATCH /objectives/:id/status`: Duyệt mục tiêu (`DRAFT` $\rightarrow$ `PENDING` $\rightarrow$ `APPROVED` / `REJECTED`).
- `DELETE /objectives/:id`: Xóa Mục tiêu.
- `POST /objectives/:id/alignments`: Thiết lập liên kết gióng hàng dọc (`VERTICAL`) hoặc chéo (`CROSS`).
- `DELETE /objectives/:id/alignments/:targetObjId`: Hủy liên kết gióng hàng.
- `GET /key-results/:id`: Xem chi tiết Key Result kèm lịch sử check-in.
- `POST /objectives/:id/key-results`: Thêm Key Result và tự động tính lại % tiến độ Mục tiêu.
- `PUT /key-results/:id`: Sửa Key Result (chỉ tiêu, đơn vị, trọng số) và tự động tính lại tiến độ.
- `DELETE /key-results/:id`: Xóa Key Result và tự động tính lại tiến độ.

### 4.7 Check-ins Module (`/check-ins`, `/key-results/:krId/check-ins`)
- `POST /key-results/:krId/check-ins`: Gửi bản check-in tiến độ (giá trị mới `newValue`, độ tự tin `confidenceScore`, ghi chú `note`, rào cản `blocker`).
- `GET /key-results/:krId/check-ins`: Xem lịch sử check-in của Key Result (Audit Log).
- `GET /check-ins/pending-reviews`: Màn hình danh sách check-in chờ Quản lý duyệt (`PENDING`).
- `PATCH /check-ins/:id/review`: Quản lý duyệt (`APPROVED`) hoặc từ chối (`REJECTED`) kèm lời nhắn phản hồi (`reviewerFeedback`). Khi duyệt thành công, giá trị KR được cập nhật và kích hoạt tính lại tiến độ tổng của Objective.

---

## 5. Thuật toán Tính toán Tiến độ có Trọng số (Weighted Progress)

Tiến độ của một Key Result và Objective được tự động tính toán theo công thức:

$$\text{Progress}_{\text{KR}} = \min\left(100, \max\left(0, \frac{\text{Current} - \text{Start}}{\text{Target} - \text{Start}} \times 100\right)\right)$$

$$\text{Progress}_{\text{Objective}} = \frac{\sum_{i=1}^{n} (\text{Progress}_{\text{KR}_i} \times \text{Weight}_i)}{\sum_{i=1}^{n} \text{Weight}_i}$$

*Mỗi khi có thay đổi từ Check-in, sửa Key Result hoặc thay đổi trọng số, hệ thống sẽ tự động cập nhật lại `progressPercentage` của Objective cha.*

---

## 6. Mô hình Dữ liệu Chính (Prisma Schema)

Hệ thống thiết kế theo chuẩn B-Tree Indexes tối ưu hóa truy vấn O(log N):

- `users`: Thông tin người dùng, phòng ban, quản lý trực tiếp, trạng thái.
- `refresh_tokens`: Lưu trữ Refresh Token đã hash với cơ chế Token Rotation.
- `roles`: Bảng vai trò hệ thống (`isSystem`) và vai trò tùy chỉnh.
- `permissions`: Bảng quyền chuẩn CASL (`action`, `subject`, `module`, `code`).
- `user_roles`: Bảng trung gian gán nhiều Role cho User.
- `role_permissions`: Bảng trung gian gán nhiều Permission cho Role.
- `departments`: Cơ cấu tổ chức phân cấp cha - con và Manager.
- `cycles`: Chu kỳ OKRs Quý/Năm và trạng thái khóa `CLOSED`.
- `objectives`: Mục tiêu cấp Company, Department, Individual.
- `objective_alignments`: Bảng liên kết gióng hàng dọc và ngang giữa các OKRs.
- `key_results`: Chỉ số đo lường tiến độ của Objective.
- `check_ins`: Nhật ký lịch sử cập nhật tiến độ, blocker và feedback phê duyệt.

---

## 7. Cài đặt & Hướng dẫn Chạy Dự án

### Yêu cầu môi trường
- Node.js 18+
- MySQL hoặc MariaDB đang chạy

### Cấu hình biến môi trường (`.env`)
Tạo file `.env` tại thư mục gốc với các thông số:

```env
DATABASE_URL="mysql://root:password@localhost:3306/okr_db"
JWT_ACCESS_SECRET="your_jwt_access_secret_key_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key_here"
CLIENT_URL="http://localhost:5173"
PORT=3000
NODE_ENV="development"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="Admin@123456"
```

### Các bước cài đặt và khởi chạy

1. **Cài đặt thư viện**:
   ```bash
   npm install
   ```

2. **Đồng bộ Database Schema**:
   ```bash
   npx prisma db push
   ```

3. **Khởi tạo dữ liệu mẫu ban đầu (Seed Permissions, Roles & Admin User)**:
   ```bash
   npx ts-node prisma/seed.ts
   ```

4. **Khởi chạy ứng dụng**:
   ```bash
   # Chế độ phát triển (Watch mode)
   npm run start:dev

   # Chế độ Production
   npm run build
   npm run start:prod
   ```

5. **Chạy kiểm thử (Unit Tests)**:
   ```bash
   npm run test
   ```

---

## 8. Tài liệu API Swagger

Khi ứng dụng chạy, tài liệu Swagger UI tương tác trực tiếp có sẵn tại:
👉 **`http://localhost:3000/swagger`**

---

## 9. Tài khoản Mặc định (Seed Account)

- **Email**: `admin@example.com`
- **Mật khẩu**: `Admin@123456`
- **Vai trò**: `SUPER_ADMIN` (Toàn quyền trên toàn bộ các modules)
