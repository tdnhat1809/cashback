# HOANTIENVIP — vận hành và triển khai

## Kiến trúc hiện tại

- React 19, TypeScript, Vite và Tailwind cho PWA responsive.
- Node.js 22, Express 5, SQLite (WAL) cho API và dữ liệu nghiệp vụ.
- Cookie phiên `HttpOnly`/`SameSite=Lax`; trình duyệt không nhận API secret, số tài khoản đầy đủ hay session token.
- Shopee: tạo link dynamic/GraphQL, ghi click, import báo cáo settlement, double-entry wallet và rút tiền thủ công.
- TikTok/RioHub, Lazada, Tiki: adapter mock không thể chi trả. TikTok chỉ được chuyển sang `payable` khi có hợp đồng/API contract được xác nhận.
- 14 hãng vận chuyển: khung adapter/mock state machine; chưa có crawler hoặc request tới trang của hãng.

## Chạy local

Yêu cầu Node.js 22+.

```powershell
Copy-Item server\.env.example server\.env
npm install
npm --prefix server install
npm run dev
```

Mở `http://localhost:5173`. API chạy ở `http://localhost:8787`; Vite đã proxy `/api` và `/r`.

Đăng nhập và đăng ký local dùng email/mật khẩu. Khi `SEED_DEMO_DATA=true`, tài khoản demo admin là `admin@hoantienvip.local` với mật khẩu `ChangeMe123!`; tài khoản này không bao giờ được seed ở production.

## Kiểm thử

```powershell
npm run check
```

Lệnh này lint frontend/backend, build cả hai và chạy test API. Bộ test bao gồm email/mật khẩu/session, trạng thái Google OAuth, URL & signature Shopee, link/click, settlement 90%, chuyển tiền ví/rút tiền idempotent, quyền admin, giftcode điểm, ticket và vận đơn.

## Luồng tiền

```text
Shopee validation report
  -> settlement import + policy snapshot (90% net sau phí/thuế)
  -> pending wallet
  -> validated/settled: available wallet
  -> user requests withdrawal: reserved
  -> finance approve -> admin transfers bank manually -> mark paid: withdrawn
```

Không import TikTok/Lazada/Tiki vào ví. Báo cáo có platform khác Shopee sẽ bị từ chối ở tầng settlement.

## API vận hành quan trọng

- `POST /api/v1/admin/settlements/import`: nhập report Shopee đã xác thực. Chỉ `operation`, `finance`, `admin`.
- `GET /api/v1/admin/settlements`, `GET /api/v1/admin/sync-runs`: kiểm tra đối soát.
- `POST /api/v1/admin/withdrawals/:id/approve`
- `POST /api/v1/admin/withdrawals/:id/reject`
- `POST /api/v1/admin/withdrawals/:id/mark-paid`

Cả ba thao tác rút tiền admin đều bắt buộc header `Idempotency-Key`; `mark-paid` bắt buộc mã giao dịch ngân hàng duy nhất.

## Production / Docker

1. Sao chép `server/.env.production.example` thành file secrets ngoài git, ví dụ `.env.prod` tại thư mục gốc.
2. Điền domain HTTPS, hai secret tối thiểu 32 ký tự, hợp đồng/API Shopee; cấu hình Google OAuth nếu muốn bật nút Google.
3. Chạy:

```powershell
docker compose --env-file .env.prod up --build -d
```

Container phục vụ cả SPA lẫn API tại port `8787`; đặt reverse proxy TLS phía trước. Production bắt buộc HTTPS vì cookie phiên có cờ `Secure`.

Để bật Google, tạo OAuth 2.0 Web client trong Google Cloud Console và khai báo chính xác `GOOGLE_REDIRECT_URI` là `https://<domain>/api/v1/auth/google/callback`. Điền đủ `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`; nếu để trống, nút Google tự bị vô hiệu hóa còn email/mật khẩu vẫn hoạt động.

Tạo/cấp lại admin sau khi đã khởi tạo dữ liệu:

```powershell
$env:ADMIN_EMAIL = 'admin@yourdomain.vn'
$env:ADMIN_PASSWORD = 'A-strong-password-2026'
$env:ADMIN_NAME = 'Quản trị viên'
npm --prefix server run admin:create
```

## Việc cần có trước khi mở thật

- Được Shopee chấp thuận bằng văn bản về cashback/sub-publisher/incentivized traffic và cấu hình App ID/secret/affiliate ID thật.
- Cấu hình OAuth consent screen, authorized redirect URI và client secret Google nếu bật đăng nhập Google.
- Ký hợp đồng và có contract chính thức RioHub/TikTok trước khi bỏ cờ mock.
- Bổ sung adapter live từng hãng vận chuyển sau khi có quyền sử dụng API hoặc cơ chế dữ liệu hợp pháp; không đưa scraper F12 vào production.
- Bật backup SQLite định kỳ hoặc chuyển tầng dữ liệu sang PostgreSQL khi có nhiều worker/traffic.
