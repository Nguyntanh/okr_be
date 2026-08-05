# OKR Backend

Backend API của hệ thống Quản lý OKR (Objectives and Key Results) được xây dựng bằng NestJS, Prisma và MySQL. Dự án hiện đang cung cấp nền tảng cơ bản cho việc quản lý người dùng, phân quyền, chu kỳ OKR, mục tiêu, kết quả then chốt và ghi nhận tiến độ.

## 1. Tổng quan hệ thống

Hệ thống tập trung vào mô hình OKR doanh nghiệp, trong đó:

- Người dùng thuộc các vai trò khác nhau: `SUPER_ADMIN`, `OKR_CHAMPION`, `MANAGER`, `EMPLOYEE`, `VIEWER`
- Mỗi người dùng có email, password, tên đầy đủ, vai trò, phòng ban và quản lý trực tiếp
- Phòng ban được mô hình hóa theo cấu trúc cha-con
- Mỗi chu kỳ OKR có thời gian bắt đầu/kết thúc và trạng thái
- Mỗi mục tiêu có chủ sở hữu, phê duyệt, mức độ, độ tự tin, trọng số, tiến độ
- Mỗi Key Result có tiêu chí đo lường cụ thể và theo dõi tiến độ
- Hệ thống hỗ trợ check-in để cập nhật tiến độ, rào cản và đánh giá lại

Hiện tại, project là backend API với mô hình dữ liệu đã hoàn chỉnh và một số module xác thực ban đầu đã được triển khai.

---

## 2. Công nghệ sử dụng

- Node.js / TypeScript
- NestJS 10
- Prisma ORM
- MySQL
- bcrypt
- @nestjs/config

Các file cấu hình và nền tảng chính:

- [package.json](package.json)
- [tsconfig.json](tsconfig.json)
- [prisma/schema.prisma](prisma/schema.prisma)
- [src/app.module.ts](src/app.module.ts)
- [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts)

---

## 3. Kiến trúc ứng dụng

### 3.1 App bootstrap

[app.module.ts](src/app.module.ts) đăng ký:

- `ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })`
- `AuthModule`

Điều này cho phép toàn bộ ứng dụng đọc biến môi trường trong suốt quá trình chạy.

### 3.2 Kết nối database

[prisma/schema.prisma](prisma/schema.prisma) định nghĩa toàn bộ mô hình dữ liệu. [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts) khởi tạo PrismaClient dựa trên `DATABASE_URL`, sử dụng `PrismaMariaDb` để kết nối MySQL.

Luồng kết nối:

1. Đọc biến môi trường `DATABASE_URL`
2. Parse host, port, username, password, database name
3. Khởi tạo `PrismaMariaDb`
4. Gắn adapter vào `PrismaClient`

---

## 4. Các module hiện có

### 4.1 Auth Module

File chính:

- [src/modules/auth/auth.module.ts](src/modules/auth/auth.module.ts)
- [src/modules/auth/auth.controller.ts](src/modules/auth/auth.controller.ts)
- [src/modules/auth/auth.service.ts](src/modules/auth/auth.service.ts)

#### Chức năng hiện có

- Đăng nhập bằng email và password
- Xác thực mật khẩu bằng bcrypt
- Tạo JWT access token và refresh token khi đăng nhập thành công
- Lưu refresh token đã hash trong bảng `refresh_tokens` và kiểm tra trạng thái hết hạn / revoke
- Gửi refresh token qua cookie HttpOnly cho bảo mật tốt hơn với XSS/CSRF
- Bảo vệ các route cần xác thực bằng `AuthGuard`
- Trả về thông tin user từ payload JWT ở endpoint profile
- Hỗ trợ refresh token để cấp lại access token mới mà không cần đăng nhập lại
- Hỗ trợ logout bằng cách revoke refresh token và xóa cookie phía client
- Xử lý lỗi 401 khi token thiếu/không hợp lệ hoặc thông tin đăng nhập sai

#### Cách hoạt động

1. Client gọi `POST /auth/login`
2. `AuthController` nhận body `{ email, password }`
3. `AuthService.signIn(email, password)` tìm user theo email và kiểm tra mật khẩu
4. Nếu không tìm thấy user hoặc mật khẩu sai -> throw `UnauthorizedException`
5. Nếu khớp -> tạo access token và refresh token, lưu refresh token đã hash vào DB
6. Refresh token được gắn vào cookie `refreshToken` với `httpOnly: true` và thời hạn 7 ngày
7. Client gửi `Authorization: Bearer <access_token>` cho route bảo vệ như `GET /auth/profile`
8. `AuthGuard` giải mã token và gắn `req.user` để controller đọc thông tin người dùng
9. Khi access token hết hạn, client gọi `POST /auth/refresh` để lấy token mới dựa trên cookie refresh token
10. `POST /auth/logout` revoke token và xóa cookie trên client

#### API Auth mới

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "123456"
}
```

Response mẫu:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "user@example.com",
    "fullName": "Nguyen Van A"
  }
}
```

Cookie được set tự động:

```http
refreshToken=<jwt-refresh-token>; HttpOnly; Path=/auth; SameSite=Lax
```

```http
GET /auth/profile
Authorization: Bearer <access_token>
```

Response mẫu:

```json
{
  "id": "1",
  "email": "user@example.com",
  "fullName": "Nguyen Van A",
  "role": "EMPLOYEE"
}
```

```http
POST /auth/refresh
```

Response mẫu:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```http
POST /auth/logout
```

Response mẫu:

```json
{
  "message": "Đăng xuất thành công"
}
```

Bản cập nhật này giúp hệ thống backend thực hiện cơ chế xác thực dạng JWT hiện đại hơn với refresh-token rotation, bảo mật cookie và route được bảo vệ an toàn hơn trước khi mở rộng cho các module quản lý OKR, phân quyền và điều hành dự án.

---

### 4.2 Users Module

File chính:

- [src/modules/users/users.module.ts](src/modules/users/users.module.ts)
- [src/modules/users/users.service.ts](src/modules/users/users.service.ts)

#### Chức năng hiện có

- Tìm user theo email
- Cung cấp service cho auth và có thể mở rộng cho CRUD người dùng sau này

#### Cách hoạt động

`UsersService.findOne(email)` thực hiện truy vấn Prisma:

```ts
this.prisma.user.findUnique({
  where: { email },
});
```

Dữ liệu người dùng được dùng trong quá trình xác thực đăng nhập.

---

## 5. Tính năng mới đã cập nhật

### 5.1 Xác thực JWT và Refresh Token

Hệ thống auth đã được nâng cấp theo cơ chế JWT chuẩn:

- `AuthService.signIn()` tạo access token và refresh token sau khi xác thực thành công
- `AuthGuard` kiểm tra `Authorization: Bearer <access_token>`
- Token access được xác minh bằng `JwtService.verifyAsync()` và gắn `req.user`
- Refresh token được lưu dưới dạng hash trong bảng `refresh_tokens`
- Refresh token được kiểm tra theo userId, trạng thái `isRevoked`, thời hạn `expiresAt`
- Hệ thống cho phép rotate refresh token khi gọi `/auth/refresh`

Điều này cho phép API bảo vệ theo quyền truy cập và hỗ trợ trải nghiệm đăng nhập dài hạn mà vẫn bảo mật tốt hơn.

### 5.2 Profile route bảo vệ

Endpoint sau đã được hỗ trợ:

- `GET /auth/profile` — chỉ truy cập được khi có access token hợp lệ
- `POST /auth/refresh` — cấp lại access token mới từ refresh token trong cookie
- `POST /auth/logout` — revoke refresh token và xóa cookie

Đây là nền tảng cho các module quản lý OKR, quyền hạn và theo dõi tiến độ sau này.

### 5.3 Bảo mật cookie và biến môi trường

Dự án hiện đang dùng `.env` với các biến quan trọng như:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL`
- `NODE_ENV`

Refresh token được lưu trong cookie `HttpOnly`, có `path: /auth`, `sameSite: Lax`, và thời hạn 7 ngày. Cách này giúp tránh lộ refresh token ở client-side JavaScript và tăng cường bảo mật ứng dụng.

---

## 6. Mô hình dữ liệu chính

### 5.1 User

Bảng `users` lưu thông tin người dùng:

- `id`: BigInt
- `email`: unique
- `password`
- `fullName`
- `avatarUrl`
- `jobTitle`
- `departmentId`
- `managerId`
- `status`
- `createdAt`, `updatedAt`

### 5.2 Department

Bảng `departments` lưu thông tin phòng ban:

- `name`
- `description`
- `parentId`
- `managerId`
- `status`

Mỗi phòng ban có thể có phòng ban cha, người quản lý và nhiều nhân sự thuộc về.

### 5.3 Cycle

Bảng `cycles` lưu chu kỳ OKR:

- `title`
- `code`
- `type` = `ANNUAL` hoặc `QUARTERLY`
- `startDate`
- `endDate`
- `status`
- `createdBy`

Chu kỳ là đơn vị thời gian để gắn các mục tiêu OKR.

### 5.4 Objective

Bảng `objectives` lưu mục tiêu:

- `title`
- `description`
- `level` = `COMPANY`, `DEPARTMENT`, `INDIVIDUAL`
- `cycleId`
- `departmentId`
- `ownerId`
- `approverId`
- `status`
- `progressPercentage`
- `confidenceScore`
- `weight`
- `isAlignedCross`

Mục tiêu mô tả kết quả cốt lõi mà tổ chức, phòng ban hoặc cá nhân cần hướng tới.

### 5.5 Key Result

Bảng `key_results` lưu các chỉ số mục tiêu:

- `title`
- `objectiveId`
- `ownerId`
- `unitType`
- `unitLabel`
- `startValue`
- `targetValue`
- `currentValue`
- `weight`

Key Result giúp đo lường tiến độ của một objective bằng các chỉ số cụ thể.

### 5.6 CheckIn

Bảng `check_ins` lưu nhật ký cập nhật tiến độ:

- `krId`
- `createdBy`
- `oldValue`
- `newValue`
- `confidenceScore`
- `note`
- `blocker`
- `reviewerId`
- `reviewerFeedback`
- `status`

Check-in có vai trò ghi nhận tiến độ mới nhất và cập nhật phản hồi từ reviewer.

---

## 6. Luồng hoạt động của hệ thống OKR

### 6.1 Tạo chu kỳ OKR

- Admin hoặc champion tạo một cycle mới
- Gán thời gian bắt đầu/kết thúc
- Chu kỳ sẽ được gắn với các objective tương ứng

### 6.2 Thiết lập objective

- Người sở hữu tạo mục tiêu mới
- Chọn mức độ: công ty, phòng ban hoặc cá nhân
- Đặt trạng thái, trọng số, mức độ tự tin
- Gán approver nếu cần

### 6.3 Thiết lập Key Result

- Với mỗi objective, người dùng có thể khai báo các KR đo lường
- Mỗi KR có giá trị bắt đầu, mục tiêu và giá trị hiện tại
- Từ đó, tiến độ có thể tính toán được

### 6.4 Cập nhật tiến độ

- Người sở hữu thực hiện check-in
- Cập nhật `oldValue` và `newValue`
- Viết note hoặc blocker
- Reviewer có thể phản hồi và đánh giá trạng thái

### 6.5 Theo dõi trạng thái

- Status của objective/check-in sẽ theo dõi các trạng thái như `DRAFT`, `APPROVED`, `REJECTED`, `CLOSED`
- Quản lý có thể kiểm tra tiến độ và đánh giá phù hợp

---

## 7. Seed admin mặc định

File: [prisma/seed.ts](prisma/seed.ts)

Hệ thống có logic seed tài khoản admin mặc định, gồm:

- email: `admin@example.com`
- mật khẩu mặc định: `Admin@123456`

Quy trình seed:

1. Đọc `DATABASE_URL`
2. Tạo Prisma client
3. Hash password bằng bcrypt
4. Dùng `upsert` để đảm bảo user admin luôn tồn tại
5. Nếu chưa có thì tạo mới; nếu đã có thì bỏ qua cập nhật

Điều này giúp môi trường mới luôn có sẵn tài khoản admin để test hệ thống.

---

## 8. Cách chạy dự án

### Yêu cầu

- Node.js 18+
- MySQL đang chạy
- Biến môi trường `DATABASE_URL` được cấu hình

Ví dụ:

```bash
DATABASE_URL=mysql://username:password@localhost:3306/okr_db
```

### Cài đặt

```bash
npm install
```

### Chạy app

```bash
npm run start
```

### Chạy ở chế độ watch

```bash
npm run start:dev
```

### Chạy test

```bash
npm run test
```

### Seed dữ liệu ban đầu

```bash
npx prisma db push
npx ts-node prisma/seed.ts
```

## 9. Tình trạng hiện tại và Hướng phát triển

Dự án đã có một nền tảng backend vững chắc với các tính năng:

- Hệ thống xác thực JWT với Refresh Token Rotation.
- Hệ thống phân quyền động (RBAC) linh hoạt và mạnh mẽ.
- Mô hình dữ liệu OKR chi tiết, được tối ưu hóa hiệu suất.
- Cơ chế seed dữ liệu tự động để khởi tạo môi trường.

Những phần cần phát triển tiếp trong tương lai gồm:

- Xây dựng các `Guard` (RolesGuard, PermissionsGuard) để bảo vệ các API dựa trên hệ thống RBAC.

## 10. Kết luận

Backend này là nền tảng để xây dựng hệ thống quản lý OKR cho doanh nghiệp. Nó đã định nghĩa rõ mô hình dữ liệu, luồng đăng nhập ban đầu và cách tổ chức dữ liệu theo các thực thể chính: người dùng, phòng ban, chu kỳ, mục tiêu, KR và check-in.

Mục tiêu cuối cùng là xây dựng một hệ thống cho phép:

- quản lý tài khoản và phân quyền
- theo dõi mục tiêu cá nhân / phòng ban / công ty
- đo lường tiến độ bằng Key Result
- cập nhật tiến độ thường xuyên
- báo cáo và phê duyệt OKR rõ ràng
