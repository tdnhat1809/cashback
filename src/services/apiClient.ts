const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';
const API_BASE_URL = configuredApiBaseUrl.replace(/\/$/, '');

export type UserRole = 'user' | 'support' | 'operation' | 'finance' | 'admin';

export interface AuthUser {
  id: string;
  publicId: string;
  phone: string | null;
  email: string | null;
  name: string;
  role: UserRole;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedSession {
  user: AuthUser;
  sessionExpiresAt: string;
}

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly retryAfterSeconds?: number;

  constructor(options: {
    message: string;
    status: number;
    code: string;
    details?: Readonly<Record<string, unknown>>;
    retryAfterSeconds?: number;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

const makeApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }
  return `${API_BASE_URL}${path}`;
};

const parseJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;

  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(makeApiUrl(path), {
      ...options,
      headers,
      body,
      credentials: 'include',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
    });
  }

  if (response.status === 204) return undefined as T;

  const payload = await parseJson(response);
  if (!response.ok) {
    const errorPayload = payload as ApiErrorEnvelope | undefined;
    const retryAfterHeader = Number(response.headers.get('Retry-After'));
    const retryAfterSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader
      : undefined;

    throw new ApiError({
      status: response.status,
      code: errorPayload?.error?.code ?? 'API_ERROR',
      message: errorPayload?.error?.message ?? `Yêu cầu thất bại (HTTP ${response.status}).`,
      details: errorPayload?.error?.details,
      retryAfterSeconds,
    });
  }

  if (payload === undefined) {
    throw new ApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'Máy chủ trả về dữ liệu không hợp lệ.',
    });
  }

  return payload as T;
};

const apiData = async <T>(path: string, options?: ApiRequestOptions): Promise<T> => {
  const envelope = await apiRequest<ApiEnvelope<T>>(path, options);
  return envelope.data;
};

export const authApi = {
  register: (input: { name: string; email: string; password: string }): Promise<VerifiedSession> => apiData('/api/v1/auth/register', {
    method: 'POST',
    body: input,
  }),

  login: (input: { email: string; password: string }): Promise<VerifiedSession> => apiData('/api/v1/auth/login', {
    method: 'POST',
    body: input,
  }),

  providers: () => apiData<{ google: boolean }>('/api/v1/auth/providers'),

  googleStartUrl: (redirect: string): string => {
    const query = new URLSearchParams({ redirect });
    return makeApiUrl(`/api/v1/auth/google/start?${query.toString()}`);
  },

  me: async (): Promise<AuthUser> => {
    const result = await apiData<{ user: AuthUser }>('/api/v1/auth/me');
    return result.user;
  },

  logout: (): Promise<void> => apiRequest('/api/v1/auth/logout', { method: 'POST' }),

  requestPasswordReset: (input: { email: string }) => apiData<{ challengeId: string; expiresAt: string; retryAfterSeconds: number; devCode?: string }>('/api/v1/auth/password-reset/request', {
    method: 'POST', body: input,
  }),

  confirmPasswordReset: (input: { email: string; challengeId: string; code: string; password: string }): Promise<void> => apiRequest('/api/v1/auth/password-reset/confirm', {
    method: 'POST', body: input,
  }),
};

export interface AffiliateLink {
  id: string;
  token: string;
  userId: string;
  platform: 'shopee' | 'tiktok';
  originUrl: string;
  normalizedUrl: string;
  providerUrl: string;
  trackingTag: string;
  status: 'active' | 'disabled' | 'failed';
  createdAt: string;
  redirectUrl?: string;
  mode?: 'disabled' | 'dynamic' | 'graphql' | 'mock';
  payable?: boolean;
}

export interface DealProduct {
  id: string;
  platform: string;
  external_item_id?: string | null;
  external_shop_id?: string | null;
  name: string;
  shop_name?: string | null;
  image_url?: string | null;
  price_vnd: number;
  original_price_vnd: number;
  source_url: string;
  commission_rate_bps?: number;
  hot_deal?: boolean;
}

export const affiliateApi = {
  createLink: (input: { platform: 'shopee' | 'tiktok'; destinationUrl: string }) => apiData<AffiliateLink>('/api/v1/affiliate-links', {
    method: 'POST', body: input,
  }),
  listLinks: () => apiData<AffiliateLink[]>('/api/v1/affiliate-links'),
};

export const catalogApi = {
  listDeals: (input: { platform?: 'shopee' | 'tiktok'; query?: string } = {}) => {
    const query = new URLSearchParams();
    if (input.platform) query.set('platform', input.platform);
    if (input.query?.trim()) query.set('q', input.query.trim());
    const suffix = query.size ? `?${query.toString()}` : '';
    return apiData<DealProduct[]>(`/api/v1/deals${suffix}`);
  },
  getProduct: (id: string) => apiData<DealProduct>(`/api/v1/products/${encodeURIComponent(id)}`),
};

export interface WalletBalances {
  pending: number;
  available: number;
  reserved: number;
  withdrawn: number;
}

export interface CashbackOrderRecord {
  id: string;
  external_order_id: string;
  status: string;
  order_value_vnd: number;
  cashback_estimate_vnd: number;
  cashback_actual_vnd: number;
  completed_at: string | null;
  created_at: string;
  platform: 'shopee' | 'tiktok';
  external_conversion_id: string;
  cashback_status: 'pending' | 'confirmed' | 'rejected' | 'paid';
}

export interface WithdrawalRecord {
  id: string;
  amount_vnd: number;
  fee_vnd: number;
  net_amount_vnd: number;
  bank_name: string;
  bank_account_masked: string;
  account_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  transaction_code: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const dashboardApi = {
  get: () => apiData<{ user: AuthUser; wallet: WalletBalances; recentOrders: CashbackOrderRecord[] }>('/api/v1/dashboard'),
  cashbackOrders: () => apiData<CashbackOrderRecord[]>('/api/v1/cashback/orders'),
  ledger: () => apiData<Array<{ id: string; reference_type: string; reference_id: string; description: string; policy_version: string | null; created_at: string; bucket: string; amount_vnd: number }>>('/api/v1/wallet/ledger'),
  withdrawals: () => apiData<WithdrawalRecord[]>('/api/v1/withdrawals'),
  requestWithdrawal: (input: { amountVnd: number; idempotencyKey: string; bankAccountId?: string; bankName?: string; bankAccountNumber?: string; accountName?: string }) => apiData<WithdrawalRecord>('/api/v1/withdrawals', {
    method: 'POST', headers: { 'Idempotency-Key': input.idempotencyKey }, body: input,
  }),
};

export interface CarrierRecord { code: string; name: string; mode: 'disabled' | 'mock' | 'live'; enabled: number; }
export interface ShipmentEventRecord { id: string; status: string; location: string | null; description: string; occurred_at: string; }
export interface ShipmentRecord {
  id: string; tracking_number: string; carrier_code: string; latest_status: string;
  last_synced_at: string | null; eta: string | null; created_at: string; updated_at: string; events?: ShipmentEventRecord[];
}

export const shipmentApi = {
  carriers: () => apiData<CarrierRecord[]>('/api/v1/carriers'),
  list: () => apiData<ShipmentRecord[]>('/api/v1/shipments'),
  get: (id: string) => apiData<ShipmentRecord>(`/api/v1/shipments/${encodeURIComponent(id)}`),
  create: (input: { trackingNumber: string; carrierCode: string; orderId?: string }) => apiData<ShipmentRecord>('/api/v1/shipments', { method: 'POST', body: input }),
  sync: (id: string) => apiData<ShipmentRecord>(`/api/v1/shipments/${encodeURIComponent(id)}/sync`, { method: 'POST' }),
};

export interface SavedProductRecord {
  id: string;
  name: string;
  platform: 'shopee' | 'tiktok';
  priceVnd: number;
  originalPriceVnd: number;
  imageUrl: string | null;
  shopName: string | null;
  sourceUrl: string;
  savedAt: string;
}

export const userFeaturesApi = {
  savedProducts: () => apiData<{ items: SavedProductRecord[]; total: number }>('/api/v1/saved-products'),
  toggleSavedProduct: (productId: string) => apiData<{ productId: string; saved: boolean }>(`/api/v1/saved-products/${encodeURIComponent(productId)}/toggle`, { method: 'POST' }),
  points: () => apiData<{ balance: number; entries: Array<{ id: string; amount: number; description: string; createdAt: string }> }>('/api/v1/points'),
  redeemGiftcode: (code: string) => apiData<{ code: string; points: number; balance: number; alreadyRedeemed: boolean }>('/api/v1/giftcodes/redeem', { method: 'POST', body: { code } }),
  referrals: () => apiData<{ referralCode: string; counts: Record<string, number>; items: unknown[] }>('/api/v1/referrals/summary'),
  profile: () => apiData<AuthUser>('/api/v1/profile'),
  updateProfile: (input: { name?: string; email?: string | null }) => apiData<AuthUser>('/api/v1/profile', { method: 'PATCH', body: input }),
  bankAccounts: () => apiData<Array<{ id: string; bankCode: string; bankName: string; accountNumberMasked: string; accountName: string; verifiedAt: string | null; active: boolean }>>('/api/v1/bank-accounts'),
  replaceDefaultBankAccount: (input: { bankCode: string; bankName: string; accountNumber: string; accountName: string }) => apiData<{ id: string; bankCode: string; bankName: string; accountNumberMasked: string; accountName: string; active: boolean }>('/api/v1/bank-accounts/default', { method: 'PUT', body: input }),
  notifications: () => apiData<{ items: Array<{ id: string; type: string; title: string; body: string; deepLink: string | null; readAt: string | null; createdAt: string }>; unread: number }>('/api/v1/notifications'),
  markAllNotificationsRead: () => apiData<{ updated: number }>('/api/v1/notifications/read-all', { method: 'PATCH' }),
  notificationPreferences: () => apiData<{ inApp: boolean; email: boolean; push: boolean; shipmentUpdates: boolean; cashbackUpdates: boolean; promotions: boolean }>('/api/v1/notifications/preferences'),
  updateNotificationPreferences: (input: Partial<{ inApp: boolean; email: boolean; push: boolean; shipmentUpdates: boolean; cashbackUpdates: boolean; promotions: boolean }>) => apiData<unknown>('/api/v1/notifications/preferences', { method: 'PATCH', body: input }),
  activityLogs: () => apiData<{ items: Array<{ id: string; action: string; targetType: string; targetId: string; createdAt: string }> }>('/api/v1/activity-logs'),
  supportTickets: () => apiData<{ items: Array<{ id: string; subject: string; category: string; priority: string; status: string; updatedAt: string; lastMessage: string | null }> }>('/api/v1/support/tickets'),
  createSupportTicket: (input: { subject: string; category: string; priority: 'low' | 'medium' | 'high'; message: string }) => apiData<{ id: string }>('/api/v1/support/tickets', { method: 'POST', body: input }),
  supportTicket: (id: string) => apiData<{ id: string; subject: string; category: string; priority: string; status: string; createdAt: string; updatedAt: string; messages: Array<{ id: string; senderType: 'user' | 'agent' | 'system'; body: string; createdAt: string }> }>(`/api/v1/support/tickets/${encodeURIComponent(id)}`),
  addSupportMessage: (id: string, body: string) => apiData<unknown>(`/api/v1/support/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { body } }),
  closeSupportTicket: (id: string) => apiData<unknown>(`/api/v1/support/tickets/${encodeURIComponent(id)}/close`, { method: 'PATCH' }),
};

export const adminApi = {
  providers: () => apiData<Array<{ provider: string; mode: string; healthy: boolean; configured: boolean; message?: string; checkedAt?: string; payable?: boolean }>>('/api/v1/admin/providers'),
  syncRuns: () => apiData<Array<{ id: string; provider: string; stream: string; mode: string; status: string; record_count: number; error: string | null; started_at: string; finished_at: string | null }>>('/api/v1/admin/sync-runs'),
  settlements: () => apiData<Array<{ id: string; platform: string; external_validation_id: string; status: string; gross_commission_vnd: number; distributable_net_vnd: number; observed_at: string; reconciled_at: string | null }>>('/api/v1/admin/settlements'),
  withdrawals: () => apiData<Array<{ id: string; user_public_id: string; user_name: string; amount_vnd: number; bank_name: string; bank_account_masked: string; account_name: string; status: 'pending' | 'approved' | 'rejected' | 'paid'; transaction_code: string | null; rejection_reason: string | null; created_at: string }>>('/api/v1/admin/withdrawals'),
  approveWithdrawal: (id: string, idempotencyKey: string) => apiData<unknown>(`/api/v1/admin/withdrawals/${encodeURIComponent(id)}/approve`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } }),
  rejectWithdrawal: (id: string, reason: string, idempotencyKey: string) => apiData<unknown>(`/api/v1/admin/withdrawals/${encodeURIComponent(id)}/reject`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { reason } }),
  markWithdrawalPaid: (id: string, transactionCode: string, idempotencyKey: string) => apiData<unknown>(`/api/v1/admin/withdrawals/${encodeURIComponent(id)}/mark-paid`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { transactionCode } }),
};
