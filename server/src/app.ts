import { createServer as createHttpServer } from 'node:http';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { z } from 'zod';
import type { AppConfig } from './config.js';
import { openDatabase, type SqliteDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { decryptString, hmacSha256 } from './lib/security.js';
import { nowIso } from './lib/ids.js';
import { AffiliateLinkService } from './modules/affiliate/AffiliateLinkService.js';
import { AuthError, AuthService, authErrorHandler, createAuthRouter, createOtpDelivery, createPasswordResetDelivery, getSessionToken } from './modules/auth/index.js';
import { WalletError, WalletService } from './modules/wallet/WalletService.js';
import { ShipmentError, ShipmentService } from './modules/shipments/ShipmentService.js';
import { createFinanceAdminRouter } from './modules/finance/index.js';
import { createUserFeaturesRouter, UserFeaturesService } from './modules/user-features/index.js';
import { ProviderError } from './providers/errors.js';
import { rioHubTikTokMockProvider } from './providers/mock/index.js';
import type { MockAffiliateProvider } from './providers/mock/types.js';
import { ShopeeAffiliateProvider } from './providers/shopee/ShopeeAffiliateProvider.js';

const affiliateLinkInput = z.object({ platform: z.enum(['shopee', 'tiktok']).default('shopee'), destinationUrl: z.string().url() });
const withdrawalInput = z.object({
  amountVnd: z.number().int().positive(),
  bankAccountId: z.string().min(1).max(128).optional(),
  bankName: z.string().min(2).max(100).optional(),
  bankAccountNumber: z.string().regex(/^\d{6,20}$/).optional(),
  accountName: z.string().min(2).max(150).optional(),
}).superRefine((value, context) => {
  if (value.bankAccountId || (value.bankName && value.bankAccountNumber && value.accountName)) return;
  context.addIssue({ code: 'custom', message: 'Chọn tài khoản ngân hàng đã lưu hoặc nhập đầy đủ thông tin nhận tiền.' });
});
const shipmentInput = z.object({
  trackingNumber: z.string().trim().min(6).max(64), carrierCode: z.string().trim().min(2).max(40), orderId: z.string().optional(),
});

const asyncHandler = (run: (request: Request, response: Response) => Promise<void> | void) =>
  (request: Request, response: Response, next: NextFunction) => Promise.resolve(run(request, response)).catch(next);

export interface AppDependencies {
  database?: SqliteDatabase;
  shopeeProvider?: ShopeeAffiliateProvider;
  tikTokProvider?: MockAffiliateProvider;
}

export const createApp = (config: AppConfig, dependencies: AppDependencies = {}) => {
  const database = dependencies.database ?? openDatabase(config.DATABASE_PATH);
  if (config.SEED_DEMO_DATA) seedDatabase(database);
  const auth = new AuthService({
    database,
    environment: config.NODE_ENV,
    devOtp: config.DEV_OTP ?? '000000',
    sessionTtlHours: config.SESSION_TTL_HOURS,
    delivery: createOtpDelivery(config),
    passwordResetDelivery: createPasswordResetDelivery(config),
  });
  const shopee = dependencies.shopeeProvider ?? ShopeeAffiliateProvider.fromConfig(config);
  const tikTok = dependencies.tikTokProvider ?? rioHubTikTokMockProvider;
  const affiliateLinks = new AffiliateLinkService(database, shopee, tikTok);
  const wallet = new WalletService(database, config.DATA_ENCRYPTION_KEY);
  const shipments = new ShipmentService(database);
  const userFeatures = new UserFeaturesService({ database, encryptionKey: config.DATA_ENCRYPTION_KEY });
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.APP_URL, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({
    enabled: config.NODE_ENV !== 'test',
    redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body.code', 'req.body.password', 'req.body.bankAccountNumber', 'req.body.email'],
  }));

  const cookieOptions = { cookieName: config.SESSION_COOKIE, environment: config.NODE_ENV, sessionTtlHours: config.SESSION_TTL_HOURS } as const;
  const currentUser = (request: Request) => auth.getCurrentUser(getSessionToken(request, config.SESSION_COOKIE));
  const requireAdmin = (request: Request) => {
    const user = currentUser(request);
    if (user.role !== 'admin') throw new AuthError('FORBIDDEN', 'Bạn không có quyền truy cập.', 403);
    return user;
  };

  app.get('/api/v1/health', asyncHandler(async (_request, response) => {
    const provider = await shopee.healthCheck();
    response.json({ data: { status: 'ok', database: 'ok', providers: [provider], timestamp: nowIso() } });
  }));
  app.use('/api/v1/auth', createAuthRouter({
    service: auth,
    ...cookieOptions,
    appUrl: config.APP_URL,
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      redirectUri: config.GOOGLE_REDIRECT_URI,
    },
  }));
  app.use('/api/v1', createUserFeaturesRouter({ service: userFeatures, auth, cookieName: config.SESSION_COOKIE }));

  app.get('/api/v1/deals', asyncHandler(async (request, response) => {
    const platform = typeof request.query.platform === 'string' ? request.query.platform : undefined;
    const keyword = typeof request.query.q === 'string' ? request.query.q.trim().toLowerCase() : '';
    if (platform === 'shopee' && config.SHOPEE_AFFILIATE_MODE === 'graphql') {
      const offers = await shopee.listProductOffers({ keyword: keyword || undefined, limit: 50 });
      response.json({ data: offers, meta: { source: 'shopee-live', payable: false } });
      return;
    }
    if (platform === 'tiktok') {
      const page = await tikTok.listProducts({ query: keyword || undefined, limit: 50 });
      response.json({
        data: page.items.map((item) => ({
          id: `mock_${item.externalItemId}`,
          platform: item.platform,
          external_item_id: item.externalItemId,
          external_shop_id: item.externalShopId,
          name: item.name,
          shop_name: item.shopName,
          image_url: item.imageUrl,
          price_vnd: item.priceVnd,
          original_price_vnd: item.originalPriceVnd,
          source_url: item.sourceUrl,
          commission_rate_bps: item.commissionRateBps,
          hot_deal: item.hotDeal,
        })),
        meta: { source: 'riohub-mock', payable: false, nextCursor: page.nextCursor },
      });
      return;
    }
    const rows = database.prepare(`
      SELECT id, platform, external_item_id, external_shop_id, name, shop_name, image_url,
             price_vnd, original_price_vnd, source_url, updated_at
      FROM products
      WHERE active = 1 AND (? IS NULL OR platform = ?) AND (? = '' OR lower(name) LIKE '%' || ? || '%')
      ORDER BY updated_at DESC LIMIT 100
    `).all(platform ?? null, platform ?? null, keyword, keyword);
    response.json({ data: rows, meta: { source: 'database', payable: false } });
  }));
  app.get('/api/v1/products/:id', asyncHandler((request, response) => {
    const row = database.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(request.params.id);
    if (!row) { response.status(404).json({ error: { code: 'product_not_found', message: 'Không tìm thấy sản phẩm.' } }); return; }
    response.json({ data: row });
  }));

  app.post('/api/v1/affiliate-links', asyncHandler(async (request, response) => {
    const user = currentUser(request);
    const input = affiliateLinkInput.parse(request.body);
    const link = await affiliateLinks.createLink(user.id, input.platform, input.destinationUrl);
    response.status(201).json({
      data: {
        ...link,
        redirectUrl: `${config.API_PUBLIC_URL.replace(/\/$/, '')}/r/${link.token}`,
        mode: input.platform === 'tiktok' ? 'mock' : shopee.mode,
        payable: input.platform === 'tiktok' ? false : shopee.mode !== 'disabled',
      },
    });
  }));
  app.get('/api/v1/affiliate-links', asyncHandler((request, response) => {
    response.json({ data: affiliateLinks.listByUser(currentUser(request).id) });
  }));
  app.get('/r/:token', asyncHandler((request, response) => {
    const link = affiliateLinks.getByToken(String(request.params.token));
    if (!link || link.status !== 'active') { response.status(404).json({ error: { code: 'link_not_found', message: 'Link không tồn tại hoặc đã bị vô hiệu hóa.' } }); return; }
    let userId: string | undefined;
    try { userId = currentUser(request).id; } catch { userId = undefined; }
    affiliateLinks.recordClick({
      linkId: link.id, userId,
      ipHash: request.ip ? hmacSha256(config.IP_HASH_PEPPER, request.ip) : undefined,
      userAgent: request.get('user-agent'), referer: request.get('referer'),
    });
    response.redirect(302, link.providerUrl);
  }));

  app.get('/api/v1/dashboard', asyncHandler((request, response) => {
    const user = currentUser(request);
    const balances = wallet.getBalances(user.id);
    const orders = database.prepare(`
      SELECT o.*, c.platform, c.status AS cashback_status FROM orders o
      JOIN conversions c ON c.id = o.conversion_id WHERE c.user_id = ? ORDER BY o.created_at DESC LIMIT 10
    `).all(user.id);
    response.json({ data: { user, wallet: balances, recentOrders: orders } });
  }));
  app.get('/api/v1/cashback/orders', asyncHandler((request, response) => {
    const user = currentUser(request);
    const orders = database.prepare(`
      SELECT o.*, c.platform, c.external_conversion_id, c.status AS cashback_status
      FROM orders o JOIN conversions c ON c.id = o.conversion_id
      WHERE c.user_id = ? ORDER BY o.created_at DESC
    `).all(user.id);
    response.json({ data: orders });
  }));
  app.get('/api/v1/wallet/ledger', asyncHandler((request, response) => {
    const user = currentUser(request);
    const walletRow = database.prepare('SELECT id FROM wallet_accounts WHERE user_id = ?').get(user.id) as { id: string } | undefined;
    const entries = walletRow ? database.prepare(`
      SELECT j.id, j.reference_type, j.reference_id, j.description, j.policy_version, j.created_at,
             p.bucket, p.amount_vnd
      FROM wallet_journals j JOIN wallet_postings p ON p.journal_id = j.id
      WHERE p.wallet_account_id = ? ORDER BY j.created_at DESC
    `).all(walletRow.id) : [];
    response.json({ data: entries, meta: { balances: wallet.getBalances(user.id) } });
  }));
  app.get('/api/v1/withdrawals', asyncHandler((request, response) => {
    response.json({ data: wallet.listWithdrawals(currentUser(request).id) });
  }));
  app.post('/api/v1/withdrawals', asyncHandler((request, response) => {
    const user = currentUser(request);
    const idempotencyKey = request.get('idempotency-key') ?? '';
    const input = withdrawalInput.parse(request.body);
    const savedBank = input.bankAccountId
      ? database.prepare(`
        SELECT bank_name, account_number_ciphertext, account_name FROM bank_accounts
        WHERE id = ? AND user_id = ? AND active = 1
      `).get(input.bankAccountId, user.id) as { bank_name: string; account_number_ciphertext: string; account_name: string } | undefined
      : undefined;
    if (input.bankAccountId && !savedBank) {
      response.status(404).json({ error: { code: 'bank_account_not_found', message: 'Không tìm thấy tài khoản ngân hàng đang dùng.' } });
      return;
    }
    const withdrawal = wallet.requestWithdrawal({
      userId: user.id, idempotencyKey, amountVnd: input.amountVnd,
      bankName: savedBank?.bank_name ?? input.bankName!,
      bankAccountNumber: savedBank ? decryptString(savedBank.account_number_ciphertext, config.DATA_ENCRYPTION_KEY) : input.bankAccountNumber!,
      accountName: savedBank?.account_name ?? input.accountName!,
    });
    response.status(201).json({ data: withdrawal });
  }));

  app.get('/api/v1/carriers', asyncHandler((request, response) => {
    currentUser(request);
    response.json({ data: shipments.listCarriers() });
  }));
  app.get('/api/v1/shipments', asyncHandler((request, response) => {
    response.json({ data: shipments.list(currentUser(request).id) });
  }));
  app.post('/api/v1/shipments', asyncHandler((request, response) => {
    const user = currentUser(request);
    const input = shipmentInput.parse(request.body);
    response.status(201).json({ data: shipments.create({ userId: user.id, ...input }) });
  }));
  app.get('/api/v1/shipments/:id', asyncHandler((request, response) => {
    response.json({ data: shipments.get(currentUser(request).id, String(request.params.id)) });
  }));
  app.post('/api/v1/shipments/:id/sync', asyncHandler((request, response) => {
    response.json({ data: shipments.syncMock(currentUser(request).id, String(request.params.id)), meta: { source: 'mock', payable: false } });
  }));

  app.get('/api/v1/admin/providers', asyncHandler(async (request, response) => {
    requireAdmin(request);
    response.json({ data: [{ ...(await shopee.healthCheck()), configured: shopee.mode !== 'disabled' }, { provider: 'tiktok', mode: tikTok.mode, healthy: true, configured: false, payable: tikTok.payable }] });
  }));
  app.use('/api/v1/admin', createFinanceAdminRouter({ database, auth, cookieName: config.SESSION_COOKIE }));

  const webIndex = join(config.WEB_DIST_PATH, 'index.html');
  if (config.NODE_ENV === 'production' && existsSync(webIndex)) {
    app.use(express.static(config.WEB_DIST_PATH, { index: false, maxAge: '1h', immutable: false }));
    app.use((request, response, next) => {
      if (request.method === 'GET' && request.accepts('html')) {
        response.sendFile(webIndex);
        return;
      }
      next();
    });
  }

  app.use(authErrorHandler);
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) { response.status(422).json({ error: { code: 'validation_error', message: 'Dữ liệu không hợp lệ.', details: z.flattenError(error).fieldErrors } }); return; }
    if (error instanceof ProviderError) { response.status(error.statusCode).json({ error: { code: error.code, message: error.message } }); return; }
    if (error instanceof WalletError) { response.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
    if (error instanceof ShipmentError) { response.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
    response.status(500).json({ error: { code: 'internal_error', message: 'Hệ thống gặp lỗi. Vui lòng thử lại.' } });
  });

  return { app, database, services: { auth, wallet, affiliateLinks, shipments, userFeatures, shopee, tikTok } };
};

export const createHttpAppServer = (config: AppConfig, dependencies?: AppDependencies) => {
  const built = createApp(config, dependencies);
  return { ...built, server: createHttpServer(built.app) };
};
