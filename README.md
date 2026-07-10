# HOANTIENVIP - Nền tảng Cashback Việt Nam

Đây là giao diện Frontend hoàn chỉnh của nền tảng Cashback Việt Nam (**HOANTIENVIP**), được xây dựng bằng **React**, **TypeScript**, và **Tailwind CSS v4** dựa trên các trang mẫu HTML sinh ra từ Google Stitch nằm trong thư mục `stitch_hoantienvip_cashback_platform_ui_ux`.

Hệ thống được thiết kế theo dạng **Single Page Application (SPA)** với định tuyến bằng **React Router DOM**, tích hợp các biểu đồ ví tiền hoàn qua **Recharts**, hệ thống theo dõi hành trình vận đơn của **14 hãng vận chuyển** lớn, và bộ dữ liệu giả lập (mock data) hoàn toàn độc lập, sạch sẽ.

---

## 🛠️ Công nghệ sử dụng
- **React 19** & **TypeScript**
- **Vite 8** (Scaffolder & Dev Server)
- **Tailwind CSS v4** (Qua plugin hiệu năng cao `@tailwindcss/vite`)
- **React Router DOM** (Định tuyến SPA)
- **Recharts** (Vẽ biểu đồ tích lũy ví tiền và thống kê admin)
- **Lucide React** (Bộ icon SVG đồng bộ)
- **Material Symbols Outlined** (Bộ icon phụ trợ theo thiết kế Stitch gốc)

---

## 🚀 Hướng dẫn chạy dự án

### 1. Cài đặt các gói phụ thuộc (Dependencies)
```bash
npm install
```

### 2. Khởi chạy dev server (Chế độ phát triển)
```bash
npm run dev
```
Trình duyệt sẽ tự động mở trang web tại địa chỉ: `http://localhost:5173/`

### 3. Kiểm tra kiểu dữ liệu & Biên dịch sản phẩm (Production Build)
```bash
npm run build
```

---

## 🗺️ Bản đồ định tuyến (Route Map) & Linh hồn Thiết kế

### A. Màn hình phía người dùng Công khai (Public Site)
| Đường dẫn (Route) | Trang giao diện React | Gốc từ thư mục HTML Stitch tham khảo | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `/` | `Home.tsx` | `trang_ch_hoantienvip_1` | Trang chủ: Hero dán link, 3 bước nhận cashback, banner referral, FAQ, Warning, Popup PWA |
| `/deals` | `Deals.tsx` | `t_m_ki_m_deal_hoantienvip` | Tìm kiếm & lọc deal theo sàn, danh mục, giá, cashback, sắp xếp linh hoạt |
| `/product/:id` | `ProductDetail.tsx` | `chi_ti_t_s_n_ph_m_hoantienvip` | Chi tiết deal: ảnh, shop, giá sale/gốc, ước tính hoàn tiền, điều kiện, mã coupon, deal liên quan |
| `/link-generator` | `LinkGenerator.tsx` | `t_o_link_ho_n_ti_n_hoantienvip` | Chuyển đổi link sản phẩm Shopee/TikTok Shop thành link tracking hoàn tiền |
| `/login` | `Login.tsx` | `ng_nh_p_ng_k_hoantienvip` | Đăng nhập/Đăng ký nhanh qua số điện thoại nhận OTP giả lập (123456) |
| `/faq` | `FAQ.tsx` | `h_tr_faq_hoantienvip` | Hỏi đáp hỗ trợ, hướng dẫn nhận hoàn tiền tránh mất cookie ghi nhận |

### B. Màn hình Bảng điều khiển người dùng (User Dashboard)
*Tất cả các route này được bọc dưới `DashboardLayout` có sidebar cố định trên desktop và bottom navigation bar tiện lợi trên mobile.*

| Đường dẫn (Route) | Trang giao diện React | Gốc từ thư mục HTML Stitch tham khảo | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `/dashboard` | `Overview.tsx` | `dashboard_ng_i_d_ng_hoantienvip` | Tổng quan số dư ví (Khả dụng, chờ duyệt, đã rút) & biểu đồ Recharts tích lũy 30 ngày |
| `/dashboard/cashback` | `CashbackHistory.tsx` | `l_ch_s_ho_n_ti_n_hoantienvip_mobile` | Lịch sử chi tiết các đơn hoàn tiền lọc theo trạng thái (Pending, Confirmed, Rejected, Paid) |
| `/dashboard/withdrawal` | `Withdrawal.tsx` | `r_t_ti_n_hoantienvip` | Form yêu cầu rút tiền về ngân hàng liên kết & lịch sử yêu cầu rút tiền |
| `/dashboard/shipment` | `ShipmentTracking.tsx` | `theo_d_i_v_n_n_hoantienvip_mobile` | Theo dõi và cập nhật vận đơn tự động nhận diện của 14 hãng vận chuyển |
| `/dashboard/saved` | `SavedProducts.tsx` | `s_n_ph_m_l_u_hoantienvip` | Grid các deal/sản phẩm mà người dùng đã bấm lưu (hình tim) |
| `/dashboard/referral` | `Referral.tsx` | `m_i_b_n_b_hoantienvip` | Lấy link/mã giới thiệu, QR code và xem danh sách bạn bè đã mời cùng hoa hồng |
| `/dashboard/rewards` | `Rewards.tsx` | `xu_th_ng_nhi_m_v_hoantienvip` | Hệ thống Xu thưởng, điểm danh nhận xu, nhiệm vụ hằng ngày và đổi quà/voucher |
| `/dashboard/settings` | `Settings.tsx` | `c_i_t_t_i_kho_n_hoantienvip` | Cập nhật tên, liên kết thẻ ngân hàng chủ tài khoản, tùy chọn bật/tắt notification |
| `/dashboard/ledger` | `BalanceHistory.tsx` | `v_l_ch_s_hoantienvip` | Biến động số dư chi tiết của ví (Wallet Ledger entries) |
| `/dashboard/logs` | `ActivityLog.tsx` | `c_nh_n_hoantienvip_mobile` | Nhật ký hoạt động bảo mật, đăng nhập, đổi ngân hàng |
| `/dashboard/notifications` | `Notifications.tsx` | `qu_t_ng_th_ng_b_o_hoantienvip` | Hộp thư thông báo cập nhật tiền hoàn về ví, trạng thái rút tiền thành công |
| `/dashboard/giftcode` | `Giftcode.tsx` | — | Nhập mã giftcode quà tặng sự kiện nhận tiền cộng thẳng vào ví |

### C. Màn hình Bảng quản trị (Admin Dashboard)
*Tất cả các route này được bọc dưới `AdminLayout` có giao diện sidebar màu tối chuyên nghiệp.*

| Đường dẫn (Route) | Trang giao diện React | Gốc từ thư mục HTML Stitch tham khảo | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `/admin` | `AdminOverview.tsx` | `qu_n_tr_h_th_ng_hoantienvip` | Thống kê chỉ số: hoa hồng sàn đối soát, cashback pending/available, tỷ lệ API lỗi |
| `/admin/management` | `AdminManagement.tsx` | `qu_n_tr_h_th_ng_motion_hoantienvip` | Quản lý đối soát đơn, duyệt rút tiền thủ công theo lô, cấu hình cổng API 14 hãng |

---

## 🎨 Design System & Tokens
- **Màu chủ đạo (Primary)**: `#b52603` (Màu đỏ cam đất sét ấm áp đại diện cho thương hiệu).
- **Màu ví tiền / thành công (Tertiary)**: `#006c49` (Xanh lục tài chính).
- **Màu phụ / Muted**: `#565e74`.
- **Màu nền**: `#fff8f6` (Màu be hồng nhạt dịu mắt).
- **Độ bo góc**: `20px` (Class `rounded-2xl` đặc trưng của Stitch).
- **Hộp kính (Glassmorphism)**: `.glass-card` (`backdrop-filter: blur(12px)`).
- **Bóng đổ mềm**: `.shadow-soft`.
