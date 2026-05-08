# System Specification (Đặc tả hệ thống) - Gia Phả Dòng Họ

Tài liệu này tổng hợp toàn bộ các nghiệp vụ, phân quyền và chức năng của hệ thống Quản lý Gia phả (Genealogy Management System).

## 1. Tổng quan
- **Mục tiêu**: Cung cấp giải pháp lưu trữ, quản lý và trực quan hóa sơ đồ phả hệ của một hoặc nhiều dòng họ.
- **Công nghệ nền tảng**: Next.js 14 (App Router), TailwindCSS, Prisma ORM, MariaDB, NextAuth.js.
- **Đa ngôn ngữ (i18n)**: Hỗ trợ 2 ngôn ngữ là Tiếng Việt (mặc định) và Tiếng Anh.

## 2. Mô hình phân quyền (RBAC)
Hệ thống quản lý quyền truy cập qua 3 vai trò (Roles) chính:
- **`ADMIN` (Quản trị viên)**: Quyền cao nhất, có thể xem, thêm, sửa, xóa tất cả các thành viên, mối quan hệ và thực hiện Nhập/Xuất toàn bộ hệ thống dữ liệu.
- **`EDITOR` (Biên tập viên)**: Có quyền quản lý hồ sơ nhân sự (thêm, sửa, xóa thành viên, mối quan hệ) và có quyền xuất (Export) dữ liệu.
- **`VIEWER` (Người xem)**: Chỉ có quyền đọc (Read-only). Chỉ được phép vào Dashboard xem tổng quan, xem danh sách thành viên và xem sơ đồ Cây gia phả. Mọi API sửa đổi hoặc xuất dữ liệu đều bị chặn ở cấp server.

## 3. Các nghiệp vụ và tính năng cốt lõi

### 3.1. Đăng nhập và Xác thực
- Sử dụng phương thức Email / Mật khẩu. Băm mật khẩu (hashing) thông qua `bcrypt`.
- Quản lý phiên làm việc bằng JSON Web Tokens (JWT) thông qua `NextAuth.js`. Thông tin `role` được mã hóa vào trong token JWT.

### 3.2. Quản lý Thành viên (Persons Management)
Hồ sơ mỗi cá nhân lưu trữ các thông tin chi tiết: Tên, Mã định danh, Giới tính, Ngày sinh, Ngày mất, Thế hệ thứ mấy, Tiểu sử.
- **Danh sách**: Hiển thị bảng kèm chức năng tìm kiếm (theo tên, mã), bộ lọc (theo thế hệ) và phân trang.
- **Tạo/Sửa hồ sơ**: Giao diện form validate dữ liệu ở FE và BE (bằng `zod`).
- **Xóa**: Nghiệp vụ áp dụng cơ chế "Xóa mềm" (*Soft delete*: `isDeleted = true`) giúp ngăn chặn mất dữ liệu do thao tác nhầm hoặc ràng buộc khoá ngoại.

### 3.3. Quản lý Mối quan hệ (Relationships Management)
Mối quan hệ kết nối giữa hai cá thể (`fromPersonId` và `toPersonId`). Có 2 phân loại chính:
1. **Loại quan hệ (`Type`)**:
   - `PARENT_CHILD`: Quan hệ Cha Mẹ - Con cái.
   - `SPOUSE`: Quan hệ Vợ - Chồng.
2. **Chi tiết quan hệ (`SubType`)**: `BIOLOGICAL` (Ruột), `ADOPTIVE` (Nuôi), `GUARDIAN` (Giám hộ), `STEP` (Kế).

### 3.4. Trực quan hóa Cây gia phả (Tree View)
- Trích xuất toàn bộ dữ liệu người dùng của Dòng họ hiện tại và biến đổi thành dạng Nodes và Edges.
- Tự động sắp xếp (Auto-layout) trực quan hệ thống các Node bằng thuật toán đồ thị có hướng (Dagre).
- Giao diện kéo thả / phóng to / thu nhỏ linh hoạt qua thư viện `reactflow`. Thiết kế Node đẹp mắt, phân biệt màu sắc giới tính. Click vào Node để xem panel thông tin chi tiết.

### 3.5. Nhập / Xuất dữ liệu (Import / Export)
Hỗ trợ di chuyển dữ liệu hàng loạt giữa các luồng/hệ thống thông qua file JSON:
- **Export**: Nén toàn bộ cấu trúc (Clans, Persons, Relationships) thành JSON để tải xuống.
- **Import**: Upload JSON vào hệ thống. Chạy qua một Transaction (giao dịch) cơ sở dữ liệu để `UPSERT` (tạo mới hoặc cập nhật nếu có), đảm bảo tính toàn vẹn (ACID) của dữ liệu nếu có lỗi xảy ra giữa chừng.

### 3.6. Dashboard (Bảng điều khiển)
Thống kê nhanh các chỉ số hệ thống:
- Tổng số lượng thành viên, Thế hệ lớn nhất, Số lượng mối quan hệ và dòng họ.
- Liệt kê 5 thành viên được thêm gần nhất vào hệ thống.

## 4. Kiến trúc cơ sở dữ liệu (Database Schema)
Các thực thể chính:
- `User`: Lưu thông tin đăng nhập, phân quyền.
- `Clan`: Định nghĩa dòng họ (VD: Dòng họ Nguyễn).
- `Person`: Thông tin cá nân (`clanId` liên kết với Clan). Có index kết hợp trên `(clanId, code)` để đảm bảo mã duy nhất trong dòng họ.
- `Relationship`: Thực thể kết nối hai `Person` bằng loại quan hệ (`type`).
- `LifeEvent` (Mở rộng tính năng sau này): Sử dụng để lưu các dự kiện mốc thời gian cụ thể của một cá nhân.
