import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { AuthError, type AuthEnvironment, type AuthService } from './service.js';

const requestOtpSchema = z.object({
  phone: z.string().min(1),
  purpose: z.enum(['login', 'password_reset']).optional(),
});

const verifyOtpSchema = z.object({
  challengeId: z.string().min(1),
  phone: z.string().min(1),
  code: z.string().min(1),
  purpose: z.enum(['login', 'password_reset']).optional(),
});

export interface SessionCookieOptions {
  cookieName: string;
  environment: AuthEnvironment;
  sessionTtlHours: number;
}

export interface AuthHttpOptions extends SessionCookieOptions {
  service: AuthService;
}

export const sessionCookieSettings = (options: SessionCookieOptions): CookieOptions => ({
  httpOnly: true,
  secure: options.environment === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: options.sessionTtlHours * 60 * 60 * 1_000,
});

export const setSessionCookie = (response: Response, token: string, options: SessionCookieOptions): void => {
  response.cookie(options.cookieName, token, sessionCookieSettings(options));
};

export const clearSessionCookie = (response: Response, options: SessionCookieOptions): void => {
  const { maxAge: _maxAge, ...clearOptions } = sessionCookieSettings(options);
  response.clearCookie(options.cookieName, clearOptions);
};

export const getSessionToken = (request: Request, cookieName: string): string | undefined => {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[cookieName];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const parseBody = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AuthError('VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.', 400, {
      fields: z.flattenError(result.error).fieldErrors,
    });
  }
  return result.data;
};

const handler = (run: (request: Request, response: Response) => void): RequestHandler =>
  (request: Request, response: Response, next: NextFunction): void => {
    try {
      run(request, response);
    } catch (error) {
      next(error);
    }
  };

export const createAuthHandlers = (options: AuthHttpOptions) => {
  const cookieOptions: SessionCookieOptions = options;

  return {
    requestOtp: handler((request, response) => {
      const result = options.service.requestOtp(parseBody(requestOtpSchema, request.body));
      response.status(201).json({ data: result });
    }),
    verifyOtp: handler((request, response) => {
      const result = options.service.verifyOtp(parseBody(verifyOtpSchema, request.body));
      setSessionCookie(response, result.sessionToken, cookieOptions);
      response.json({
        data: {
          user: result.user,
          sessionExpiresAt: result.sessionExpiresAt,
        },
      });
    }),
    me: handler((request, response) => {
      const user = options.service.getCurrentUser(getSessionToken(request, options.cookieName));
      response.json({ data: { user } });
    }),
    logout: handler((request, response) => {
      options.service.logout(getSessionToken(request, options.cookieName));
      clearSessionCookie(response, cookieOptions);
      response.status(204).end();
    }),
  };
};

export const createAuthRouter = (options: AuthHttpOptions): Router => {
  const router = Router();
  const handlers = createAuthHandlers(options);
  router.post('/otp/request', handlers.requestOtp);
  router.post('/otp/verify', handlers.verifyOtp);
  router.get('/me', handlers.me);
  router.post('/logout', handlers.logout);
  return router;
};

export const authErrorHandler = (error: unknown, _request: Request, response: Response, next: NextFunction): void => {
  if (!(error instanceof AuthError)) {
    next(error);
    return;
  }

  if (error.code === 'OTP_RATE_LIMITED') {
    const retryAfterSeconds = error.details?.retryAfterSeconds;
    if (typeof retryAfterSeconds === 'number') response.setHeader('Retry-After', String(retryAfterSeconds));
  }

  response.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};
