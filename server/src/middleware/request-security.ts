import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthEnvironment } from '../modules/auth/service.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class RequestSecurityError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly retryAfterSeconds?: number) {
    super(message);
    this.name = 'RequestSecurityError';
  }
}

export const requireTrustedOrigin = (appUrl: string, environment: AuthEnvironment): RequestHandler =>
  (request, _response, next): void => {
    if (environment !== 'production' || !MUTATING_METHODS.has(request.method) || request.path.startsWith('/webhooks/')) {
      next();
      return;
    }
    const origin = request.get('origin');
    if (!origin || origin !== appUrl) {
      next(new RequestSecurityError('CSRF_ORIGIN_INVALID', 'Nguồn yêu cầu không được phép.', 403));
      return;
    }
    next();
  };

interface RateLimitOptions {
  windowMs: number;
  max: number;
  key: (request: Request) => string;
  code: string;
}

export const createFixedWindowRateLimiter = (options: RateLimitOptions): RequestHandler => {
  const entries = new Map<string, { count: number; startedAt: number }>();
  return (request: Request, _response: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = options.key(request);
    const current = entries.get(key);
    const entry = !current || now - current.startedAt >= options.windowMs
      ? { count: 0, startedAt: now }
      : current;
    entry.count += 1;
    entries.set(key, entry);
    if (entry.count > options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((options.windowMs - (now - entry.startedAt)) / 1_000));
      next(new RequestSecurityError(options.code, 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.', 429, retryAfterSeconds));
      return;
    }
    next();
  };
};
