# Kế hoạch nền tảng Cashback Việt Nam

## 1. Mục tiêu và phạm vi MVP

Xây dựng website responsive có thể cài như PWA, giúp người dùng:

- Tìm deal hot, deal dưới 10.000đ và coupon từ Shopee, TikTok Shop.
- Dán link sản phẩm để tạo affiliate link có tracking riêng cho từng user.
- Mua qua link, theo dõi trạng thái đơn và nhận cashback khi sàn đối soát.
- Quản lý ví, lịch sử cashback, Xu thưởng, referral, giftcode, rút tiền và vận đơn.

MVP chỉ mở cashback cho **Shopee** và **TikTok Shop qua RioHub**. Kiến trúc phải cho phép bổ sung AccessTrade, Lazada, Tiki và các affiliate network khác bằng adapter mới, không thay đổi logic ví hoặc giao diện khách hàng.

## 2. Quy tắc tài chính

Cashback chỉ được ghi có cho user khi nguồn affiliate trả trạng thái đối soát/settled và hoa hồng thực nhận.

```text
Hoa hồng nguồn
- phí/khấu trừ upstream
= hoa hồng được phân phối
× 90%
= cashback trước thuế của user
- khấu trừ thuế theo chính sách đang hiệu lực
= tiền chi trả thực tế
```

- Dùng số tiền dạng `decimal` hoặc đơn vị VND nguyên; không dùng `float`.
- Mọi khoản tiền là sổ cái bất biến: thêm bút toán, không sửa/xóa số dư lịch sử.
- Lưu phiên bản rule cashback và tax policy vào từng bút toán.
- Cashback ước tính không thể rút; chỉ cashback đã xác nhận mới chuyển vào số dư khả dụng.
- Rút tiền thủ công: finance kiểm tra yêu cầu, chuyển khoản ngoài hệ thống, nhập mã giao dịch, rồi mới ghi bút toán `withdrawal_paid`.
- Không hard-code thuế suất. Kế toán/pháp lý xác nhận cách khấu trừ trước khi phát hành.

## 3. Công nghệ và hạ tầng

### 3.1 Kiến trúc

Chọn **modular monolith** để phát hành nhanh, vẫn tách ranh giới module rõ ràng:

```text
PWA React/Inertia
        ↓
Laravel Web + Internal API
        ├── Affiliate adapters
        ├── Wallet ledger
        ├── Order reconciliation
        ├── Shipment tracking
        └── Admin/operations
        ↓
PostgreSQL + Redis Queue + Object Storage
```

### 3.2 Stack đề xuất

- Backend: PHP 8.3+ và Laravel bản ổn định.
- Frontend: React + TypeScript qua Inertia, Tailwind CSS, Lucide icons.
- PWA: web manifest, service worker, push notification có consent, custom install prompt.
- Database: PostgreSQL.
- Queue/cache/rate limit: Redis.
- File export/chứng từ: S3-compatible object storage.
- Deploy: Docker, Cloudflare CDN/WAF, managed PostgreSQL, tách web process/worker/scheduler.
- Quan sát: structured log, Sentry, health checks, metrics queue/API sync.
- CI/CD: unit test, integration test, migration check, build frontend và deploy staging trước production.

### 3.3 Nguyên tắc PWA

- Cache tài nguyên tĩnh và trang công khai; không cache API, session, ví hoặc dữ liệu tài chính.
- Có manifest, icon, `display: standalone`, shortcuts và install prompt.
- Hỗ trợ tốt Chrome Android/desktop; iOS hiển thị hướng dẫn Add to Home Screen.

## 4. Các module sản phẩm

### 4.1 Khách hàng và xác thực

- Đăng ký/đăng nhập số điện thoại OTP; email tùy chọn.
- Hồ sơ, thiết lập thông báo, tài khoản ngân hàng nhận tiền.
- Consent chính sách dữ liệu, điều khoản cashback và điều khoản chống gian lận.
- Activity log cho login, đổi thông tin ngân hàng, tạo link, yêu cầu rút tiền.

### 4.2 Trang chủ và khám phá deal

- Hero nhập URL Shopee/TikTok Shop với CTA `Lấy link hoàn tiền`.
- Deal hot, deal dưới 10.000đ, cashback cao, coupon, sản phẩm theo danh mục.
- Tìm kiếm/lọc theo sàn, giá, danh mục, % giảm, mức cashback.
- Card sản phẩm: ảnh, shop, giá gốc/giá sale, badge deal, cashback ước tính, nút mua và nút lưu.
- Biên tập viên/admin tuyển chọn deal; không hứa cashback cố định khi nguồn chỉ trả ước tính.

### 4.3 Tạo link và attributionkhác, tuân theo framework hiện có và không thay đổi kiến trúc không cần thiết.
- Tạo mock data tách riêng; chưa tích hợp backend/API thật.

- Xác thực, chuẩn hóa và whitelist domain URL đầu vào.
- User phải đăng nhập trước khi hệ thống tạo tracking link.
- Lưu click nội bộ: user, link token, merchant, sản phẩm, thời điểm, user agent rút gọn và trạng thái redirect.
- Không ghi cashback theo click hay đơn user tự khai.
- Hiển thị điều kiện cashback trước khi redirect sang sàn.

### 4.4 Dashboard user

- Ví của tôi: số dư khả dụng, chờ duyệt, đang rút, tổng đã nhận.
- Lịch sử hoàn tiền: từng item/đơn, sàn, trạng thái, tiền ước tính/thực nhận và lý do từ chối.
- Sản phẩm đã lưu, cảnh báo giảm giá/cashback thay đổi.
- Tiếp thị liên kết/referral: link mời, QR code, số người mời và phần thưởng.
- Yêu cầu rút tiền, Giftcode, thiết lập tài khoản, thông báo, biến động số dư, nhật ký hoạt động.
- Xu thưởng: số Xu, lịch sử, nhiệm vụ và quà đổi. Xu không quy đổi trực tiếp thành tiền trong MVP.

### 4.5 Backoffice

Vai trò: Super Admin, vận hành cashback, tài chính, CSKH, biên tập deal.

- Dashboard GMV affiliate, hoa hồng nguồn, cashback pending/available/paid, yêu cầu rút và lỗi sync.
- Quản lý user, product/deal, rule cashback, giftcode, Xu, referral, banner, FAQ và thông báo.
- Đối soát nguồn: số đơn/commission upstream so với số bút toán đã ghi ví.
- Duyệt rút tiền theo lô, export danh sách chuyển khoản, nhập mã giao dịch, audit trail.
- Quản lý health, credential rotation và retry của provider adapters.

## 5. Tích hợp affiliate

### 5.1 Interface dùng chung

Mỗi nguồn triển khai `AffiliateNetworkAdapter`:

```text
validateAndNormalizeUrl(url)
getDealFeed(cursor/filter)
getProduct(productId)
generateUserLink(userTrackingId, productUrl/productId)
syncConversions(cursor/timeRange)
mapConversion(rawRecord)
verifyWebhook(request)
```

Adapter trả về mô hình chuẩn gồm product, click link, conversion, order item, gross commission, net commission, status, tracking ID, raw evidence và thời điểm cập nhật.

### 5.2 Shopee Affiliate

- Đồng bộ product/shop offer và deal theo lịch.
- Tạo short link với `subIds`; dùng mã user/link nội bộ không chứa PII.
- Đồng bộ conversion report theo cursor; xử lý phân trang liên tục trong thời hạn cursor.
- Map `PENDING` thành cashback chờ duyệt; chỉ ghi khả dụng khi validated/approved; đảo bút toán khi cancelled/rejected/fraud.
- `bcat95/shopee-aff` chỉ là tài liệu/reference request. Gọi API chính thức trực tiếp qua adapter, không phụ thuộc vào repo.
- Các SDK Open Platform phía seller chỉ dùng khi có nhu cầu seller data; không là lõi attribution cashback người mua.

### 5.3 TikTok Shop qua RioHub

RioHub là TikTok adapter chính của MVP.

- API key chỉ nằm ở backend secret manager, gửi trong header `X-Riohub-Api-Key`.
- Mỗi key chỉ thao tác creator TikTok mà tài khoản RioHub đã kết nối; cấu hình house creator/account trong admin.
- Tạo tracking tag: `u{publicUserId}-l{publicLinkId}`. Chỉ dùng ký tự chữ/số, `_` và `-`; không đưa số điện thoại hay PII vào tag.
- Gọi `POST /api/v1/partner/tiktok/affiliate/links` với `creator_username`, `product_url` hoặc `product_id`, `sub_id`.
- Lưu `affiliate_link`, `sub_id`, creator, user, sản phẩm, snapshot hoa hồng và thời điểm tạo trước khi redirect.
- Dùng `GET /api/v1/partner/tiktok/affiliate/orders` theo `update_time_start` để đồng bộ tăng dần và làm fallback webhook.
- Map `sub1` về user, `sub2` về link. Nếu không map được user, đưa vào hàng đợi đối soát admin, không tự ghi ví.
- `status=1` là pending; `status=2` và `settlement_status=SETTLED` cùng `actual_commission` là điều kiện ghi cashback khả dụng; `status=3`/REFUNDED đảo hoặc từ chối cashback.
- Dùng `GET /api/v1/partner/tiktok/affiliate/products` để làm giàu product details; không coi đây là feed deal hot toàn sàn.
- Không dùng endpoint deep link theo lô để trả cashback vì endpoint đó không mang `sub_id`; chỉ dùng cho trải nghiệm chia sẻ nếu cần.
- Đăng ký webhook RioHub cho `order.created`, `order.updated`, `order.refunded`; xác minh HMAC từ `X-Riohub-Signature`, lưu `event_id` idempotent và đẩy vào queue.
- Tôn trọng giới hạn nguồn: 300 request/phút, 100.000 request/ngày; retry theo `Retry-After` khi gặp 429.

### 5.4 Mở rộng sau MVP

- AccessTrade là adapter ưu tiên cho Lazada, Tiki và campaign khác vì có deeplink `sub1...sub4` cùng conversion report Pending/Approved/Rejected.
- Các network/sàn khác chỉ mở cashback khi cung cấp được tracking ID hoặc postback gán chắc chắn về user.

## 6. Sổ cái, chống gian lận và đối soát

### 6.1 Bảng dữ liệu cốt lõi

- `users`, `user_profiles`, `bank_accounts`, `roles`.
- `affiliate_links`, `affiliate_clicks`, `products`, `deals`.
- `conversions`, `orders`, `order_items`, `source_sync_cursors`, `webhook_events`.
- `wallet_accounts`, `ledger_entries`, `withdrawal_requests`, `payout_batches`.
- `point_accounts`, `point_ledger_entries`, `giftcodes`, `referrals`.
- `audit_logs`, `notifications`.

### 6.2 Chống gian lận

- Rate limit tạo link, OTP, voucher và yêu cầu rút tiền.
- Phát hiện user/bank account/device/IP bất thường, referral vòng lặp, nhiều account chia sẻ dấu hiệu thiết bị.
- Hold payout khi nguồn trả fraud/rejected hoặc rule rủi ro kích hoạt.
- Không xóa bút toán; refund/chargeback bằng bút toán điều chỉnh.
- Admin action có lý do, người thực hiện và audit log.

## 7. Theo dõi vận đơn 14 hãng

### 7.1 Mục tiêu

Cho user theo dõi vận đơn liên quan đến đơn cashback hoặc vận đơn tự thêm. Giai đoạn đầu chỉ dựng khung; chưa viết crawler từng hãng.

Hãng cần seed sẵn:

```text
SPX, LEX, EMS, J&T, GHN, 247Express, VNPost, Viettel Post,
GHTK, Best, Futa, Nhất Tín, Netco, NetPost
```

### 7.2 Kiến trúc

```text
Đơn cashback hoặc user nhập tracking number
        ↓
ShipmentTracking Service
        ↓
CarrierTrackingAdapter
        ↓
SPX | LEX | EMS | J&T | GHN | ...
        ↓
Timeline chuẩn hóa + notification
```

Giao diện connector:

```text
detect(trackingNumber): confidence
track(trackingNumber): TrackingSnapshot
healthCheck(): ProviderHealth
```

### 7.3 Dữ liệu

- `carriers`: mã hãng, tên, logo, connector status, rate limit và cấu hình.
- `shipments`: owner user, tracking number, carrier, liên kết order nếu có, latest status, last synced at.
- `shipment_events`: timeline bất biến, status chuẩn, thời gian, địa điểm rút gọn, event hash chống trùng.
- `shipment_sync_jobs`: retry/error/lần chạy kế tiếp.
- `carrier_connector_configs`: endpoint, credential/config source, trạng thái pause/enable.

Trạng thái chuẩn:

```text
CREATED, PICKED_UP, IN_TRANSIT, AT_SORTING_HUB, OUT_FOR_DELIVERY,
DELIVERED, DELIVERY_FAILED, RETURNING, RETURNED, CANCELLED,
EXCEPTION, UNKNOWN
```

### 7.4 UX vận đơn

- Thêm menu `Theo dõi đơn hàng` trong dashboard.
- Danh sách vận đơn: mã, hãng, trạng thái, cập nhật mới nhất, ETA nếu nguồn có dữ liệu.
- Form thêm vận đơn: chọn/tự nhận diện hãng, nhập mã, tùy chọn liên kết đơn cashback.
- Timeline chi tiết: đã lấy hàng, đang vận chuyển, đang giao, giao thành công, giao thất bại hoặc hoàn hàng.
- Card cashback order hiện `Theo dõi giao hàng` nếu có tracking number.
- In-app/push/email notification cho out-for-delivery, delivered, delivery-failed và returned.
- MVP chỉ cho user đã đăng nhập xem vận đơn của chính họ; không mở public lookup để giảm lộ dữ liệu và spam request.

### 7.5 Lộ trình connector

- Seed đủ 14 hãng với `connector_status=disabled`.
- Dùng `MockTrackingAdapter` để hoàn thiện UI, queue, notification và test trước.
- Sau khi xác định request/API hợp pháp của từng hãng, thêm adapter và mapping response riêng.
- Không xây CAPTCHA bypass, proxy rotation hoặc cơ chế né anti-bot. Nếu provider chặn tự động hóa, pause connector và dùng API/đối tác chính thức hoặc đồng bộ thủ công.
- Đồng bộ: 30 phút/lần khi đang giao; 10–15 phút/lần khi out-for-delivery; dừng 7 ngày sau delivered/returned/cancelled.
- Che PII trong raw response; chỉ technical admin được xem evidence debug đã redacted.

## 8. API nội bộ

```text
POST   /api/v1/links
GET    /r/{linkToken}

GET    /api/v1/dashboard
GET    /api/v1/cashback/orders
POST   /api/v1/withdrawals

POST   /api/v1/shipments
GET    /api/v1/shipments
GET    /api/v1/shipments/{id}
POST   /api/v1/shipments/{id}/refresh
DELETE /api/v1/shipments/{id}

POST   /webhooks/riohub

GET    /admin/carriers
PATCH  /admin/carriers/{carrier}
GET    /admin/shipment-sync-health
POST   /admin/carriers/{carrier}/test
```

## 9. Bảo mật và tuân thủ

- Mã hóa API token, refresh token, webhook secret và tài khoản ngân hàng khi lưu.
- Secrets chỉ qua environment/secret manager; không đưa vào repo hoặc browser.
- Verify chữ ký webhook, timestamp và chống replay.
- RBAC, 2FA cho finance/admin, audit log bất biến.
- Có privacy policy, consent, data retention/deletion/export và hạn chế truy cập PII.
- Điều khoản ghi rõ cashback chỉ là ước tính cho đến khi nguồn affiliate đối soát.

## 10. Lộ trình triển khai

1. **Foundation:** repository, Docker, Laravel/Inertia, auth OTP, PostgreSQL, Redis, RBAC, audit log, staging/CI.
2. **Wallet:** ledger, cashback state machine, withdrawal workflow, admin finance, policy versioning.
3. **Shopee:** product/deal sync, link generator, conversion importer, reconciliation và dashboard cashback.
4. **RioHub TikTok:** API key management, link/sub-id creation, webhook, incremental order sync và actual-commission settlement.
5. **UX/PWA:** homepage, search/deal, product detail, dashboard đầy đủ, referral/giftcode/Xu, PWA install/notification.
6. **Shipment skeleton:** 14 carrier configs, mock adapter, shipment UI, timeline, queue, health dashboard.
7. **Operations:** fraud rules, payout batches, reports, monitoring, carrier connectors lần lượt.
8. **Mở rộng:** AccessTrade trước, sau đó Lazada/Tiki và các network khác.

## 11. Kiểm thử và tiêu chí nghiệm thu

- Một user tạo Shopee/TikTok link; conversion về đúng user theo tracking ID.
- Đồng bộ lại nhiều lần không tạo cashback/ledger entry trùng.
- Pending → settled → refund/reject tạo trạng thái và bút toán đúng.
- Tổng ví luôn khớp tổng ledger; đối soát admin phát hiện được chênh lệch nguồn.
- Rút tiền chỉ được mark paid sau khi finance nhập mã giao dịch.
- Webhook signature sai, duplicate event, expired event và retry đều được xử lý an toàn.
- Shipment UI hoạt động bằng mock cho cả 14 hãng; user không xem được vận đơn của user khác.
- PWA cài được trên Chrome Android/desktop, giao diện hoạt động tốt trên mobile và không cache dữ liệu tài chính.

## 12. Giả định hiện tại

- Thanh toán bằng VND tại Việt Nam.
- Rút tiền manual ở MVP.
- Referral một tầng ở MVP.
- Xu là loyalty point không đổi trực tiếp thành tiền.
- TikTok sử dụng creator đã kết nối và được RioHub cấp API key phù hợp.
- Deal TikTok được admin tuyển chọn từ product URL/ID cho đến khi có feed hợp pháp phù hợp.
