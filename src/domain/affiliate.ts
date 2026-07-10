export type AffiliatePlatform = 'Shopee' | 'TikTok Shop';

export interface NormalizedAffiliateUrl {
  platform: AffiliatePlatform;
  sourceUrl: string;
  normalizedUrl: string;
  hostname: string;
}

export interface AffiliateLinkDraft {
  id: string;
  token: string;
  publicUserId: string;
  platform: AffiliatePlatform;
  sourceUrl: string;
  normalizedUrl: string;
  trackingTag: string;
  shortUrl: string;
  createdAt: string;
}

const platformHosts: Record<AffiliatePlatform, readonly string[]> = {
  Shopee: ['shopee.vn', 'shp.ee'],
  'TikTok Shop': ['tiktok.com', 'shop.tiktok.com', 'vt.tiktok.com'],
};

const isAllowedHost = (host: string, allowedHost: string) => host === allowedHost || host.endsWith(`.${allowedHost}`);

const getPlatform = (hostname: string): AffiliatePlatform | null => {
  for (const [platform, hosts] of Object.entries(platformHosts) as Array<[AffiliatePlatform, readonly string[]]>) {
    if (hosts.some((host) => isAllowedHost(hostname, host))) return platform;
  }
  return null;
};

export const normalizeAffiliateUrl = (value: string): NormalizedAffiliateUrl => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Đường dẫn phải là URL hợp lệ bắt đầu bằng http:// hoặc https://.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Đường dẫn phải bắt đầu bằng http:// hoặc https://.');
  }
  if (url.username || url.password) {
    throw new Error('Đường dẫn sản phẩm không được chứa thông tin đăng nhập.');
  }

  const hostname = url.hostname.toLowerCase();
  const platform = getPlatform(hostname);
  if (!platform) {
    throw new Error('HOANTIENVIP hiện chỉ hỗ trợ link Shopee và TikTok Shop.');
  }

  url.hash = '';
  url.hostname = hostname;
  return {
    platform,
    sourceUrl: value.trim(),
    normalizedUrl: url.toString(),
    hostname,
  };
};

export const createTrackingTag = (publicUserId: string, linkId: string) => {
  const normalizeId = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 48);
  const user = normalizeId(publicUserId);
  const link = normalizeId(linkId);
  if (!user || !link) throw new Error('Không thể tạo mã theo dõi cho liên kết này.');
  return `u${user}_l${link}`;
};

const createOpaqueToken = () => {
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, '') ?? Math.random().toString(36).slice(2);
  return random.slice(0, 16);
};

export const createAffiliateLinkDraft = (sourceUrl: string, publicUserId: string): AffiliateLinkDraft => {
  const normalized = normalizeAffiliateUrl(sourceUrl);
  const id = `lnk_${createOpaqueToken()}`;
  const token = createOpaqueToken();
  return {
    id,
    token,
    publicUserId,
    platform: normalized.platform,
    sourceUrl: normalized.sourceUrl,
    normalizedUrl: normalized.normalizedUrl,
    trackingTag: createTrackingTag(publicUserId, id),
    shortUrl: `https://hoantienvip.vn/r/${token}`,
    createdAt: new Date().toISOString(),
  };
};
