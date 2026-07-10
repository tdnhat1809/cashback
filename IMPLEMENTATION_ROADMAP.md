# Roadmap triển khai chức năng HOANTIENVIP

## Nguyên tắc triển khai

- Frontend hiện tại là prototype React. Mọi dữ liệu mock/client-side phải nằm sau service/domain module để thay bằng Laravel API mà không viết lại UI.
- Không lưu API key affiliate, webhook secret, tài khoản ngân hàng hoặc dữ liệu định danh nhạy cảm ở browser.
- Mọi giá trị tiền dùng VND nguyên; không dùng `float`. Sổ cái chỉ thêm bút toán mới, không sửa bút toán cũ.
- Cashback chỉ là ước tính trước khi nguồn affiliate trả trạng thái settled và actual commission.

## P0 — Foundation (đang triển khai)

| Hạng mục | Frontend hiện tại | Backend sau này | Tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| Affiliate link | Chuẩn hóa URL, whitelist host, tạo tracking tag và draft link local | `POST /api/v1/links`, redirect `/r/{token}` | Link Shopee/TikTok được map đúng adapter; host lạ bị chặn |
| Cashback engine | Tính VND nguyên, policy version, state machine | Service Laravel + PostgreSQL | Cùng input luôn ra cùng kết quả; không làm tròn sai |
| Wallet ledger | Hàm append idempotent, tính số dư | `ledger_entries`, transaction DB | Không ghi trùng idempotency key; balance khớp tổng entry |
| API boundary | Demo service localStorage | HTTP client + Laravel API | UI không gọi adapter trực tiếp |

## P1 — Xác thực và quyền hạn

1. Laravel: users, OTP challenges, sessions, password reset tokens, roles, audit logs.
2. Frontend: auth store, route guard, login/register/forgot/reset password, consent pháp lý.
3. RBAC: user, support, operation, finance, super admin; route admin phải được backend kiểm tra.
4. Tiêu chí: rate limit OTP, hết hạn OTP, 2FA admin, audit mọi thay đổi bank/rule/payout.

## P2 — Cashback và ví

1. Bảng: products, affiliate_links, clicks, conversions, orders, wallet_accounts, ledger_entries.
2. State machine: `pending -> confirmed -> paid`; `pending|confirmed -> rejected`; hoàn/chargeback tạo adjustment entry.
3. Withdrawal: kiểm tra số dư khả dụng, tạo request, duyệt finance, nhập mã giao dịch, append `withdrawal_paid`.
4. Tiêu chí: idempotent sync/webhook, export payout batch, đối soát nguồn phát hiện chênh lệch.

## P3 — Affiliate adapters

1. `ShopeeAffiliateAdapter`: validate URL, link sub-id, import conversion theo cursor.
2. `RioHubTikTokAdapter`: generate link với sub-id, webhook HMAC, incremental order sync, retry `429` theo `Retry-After`.
3. Không gọi SDK/repo không chính thức từ browser. Provider credentials chỉ ở secret manager/backend.
4. Tiêu chí: webhook duplicate không tạo duplicate conversion/ledger entry.

## P4 — Deal, referral, giftcode và notification

1. Admin quản trị deal/rule/giftcode/reward/referral/banner/FAQ/notification.
2. User lưu sản phẩm, nhận cảnh báo giá/cashback, đổi Xu, referral một tầng.
3. Push chỉ sau consent; email/push/in-app có notification preference và deep-link.

## P5 — Vận đơn 14 hãng

1. Seed carrier configs: SPX, LEX, EMS, J&T, GHN, 247Express, VNPost, Viettel Post, GHTK, Best, Futa, Nhất Tín, Netco, NetPost.
2. `MockTrackingAdapter` trước; mỗi connector thật chỉ dùng API/đối tác được phép.
3. Shipment job + immutable timeline + status mapping + notification out-for-delivery/delivered/failed/returned.
4. Tiêu chí: user chỉ xem shipment của mình; unknown carrier yêu cầu chọn thủ công.

## P6 — Vận hành, bảo mật và phát hành

1. PostgreSQL, Redis queue, object storage, scheduled workers, health checks, structured logs, Sentry.
2. Mã hóa secrets và bank account, WAF/rate-limit, backup/restore drill, staging/CI/CD.
3. Test: unit domain, API integration, webhook signature/idempotency, e2e core purchase-to-payout flow.

## Thứ tự code tiếp theo

1. Hoàn tất domain modules P0 và nối Link Generator với demo service.
2. Tạo auth store/route guards sau khi UI Antigravity hoàn tất.
3. Dựng Laravel + PostgreSQL migration cho affiliate links, conversions, wallet/ledger trước khi nối API Shopee/RioHub.
