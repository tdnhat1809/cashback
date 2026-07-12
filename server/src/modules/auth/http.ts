import { OAuth2Client } from 'google-auth-library';
import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { AuthError, type AuthEnvironment, type AuthService } from './service.js';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(254),
}).strict();

const passwordResetConfirmSchema = z.object({
  email: z.string().trim().email().max(254),
  challengeId: z.string().trim().min(1).max(512),
  code: z.string().trim().regex(/^\d{6}$/),
  password: z.string().min(1).max(128),
}).strict();

export interface SessionCookieOptions {
  cookieName: string;
  environment: AuthEnvironment;
  sessionTtlHours: number;
}

export interface GoogleOAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AuthHttpOptions extends SessionCookieOptions {
  service: AuthService;
  appUrl: string;
  google: GoogleOAuthOptions;
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

const getCookieValue = (request: Request, cookieName: string): string | undefined => {
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

const handler = (run: (request: Request, response: Response) => Promise<void> | void): RequestHandler =>
  (request: Request, response: Response, next: NextFunction): void => {
    Promise.resolve(run(request, response)).catch(next);
  };

const isGoogleConfigured = (google: GoogleOAuthOptions): boolean =>
  Boolean(google.clientId && google.clientSecret && google.redirectUri);

const safeRedirectPath = (value: unknown): string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';

const appRedirectUrl = (appUrl: string, path: string): string => new URL(path, appUrl).toString();

const googleStateCookieSettings = (options: SessionCookieOptions): CookieOptions => ({
  httpOnly: true,
  secure: options.environment === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 10 * 60 * 1_000,
});

const googleStateCookieName = (options: SessionCookieOptions): string => `${options.cookieName}_google_state`;

const clearGoogleStateCookie = (response: Response, options: SessionCookieOptions): void => {
  const { maxAge: _maxAge, ...clearOptions } = googleStateCookieSettings(options);
  response.clearCookie(googleStateCookieName(options), clearOptions);
};

export const createAuthHandlers = (options: AuthHttpOptions) => {
  const cookieOptions: SessionCookieOptions = options;

  return {
    register: handler((request, response) => {
      const result = options.service.registerWithPassword(parseBody(registerSchema, request.body));
      setSessionCookie(response, result.sessionToken, cookieOptions);
      response.status(201).json({ data: { user: result.user, sessionExpiresAt: result.sessionExpiresAt } });
    }),
    login: handler((request, response) => {
      const result = options.service.loginWithPassword(parseBody(loginSchema, request.body));
      setSessionCookie(response, result.sessionToken, cookieOptions);
      response.json({ data: { user: result.user, sessionExpiresAt: result.sessionExpiresAt } });
    }),
    passwordResetRequest: handler(async (request, response) => {
      const result = await options.service.requestPasswordReset(parseBody(passwordResetRequestSchema, request.body));
      response.status(202).json({ data: result });
    }),
    passwordResetConfirm: handler((request, response) => {
      options.service.confirmPasswordReset(parseBody(passwordResetConfirmSchema, request.body));
      response.status(204).end();
    }),
    providers: handler((_request, response) => {
      response.json({ data: { google: isGoogleConfigured(options.google) } });
    }),
    googleStart: handler((request, response) => {
      if (!isGoogleConfigured(options.google)) {
        throw new AuthError('GOOGLE_NOT_CONFIGURED', 'Đăng nhập Google chưa được cấu hình.', 503);
      }
      const state = options.service.beginGoogleLogin(safeRedirectPath(request.query.redirect));
      response.cookie(googleStateCookieName(cookieOptions), state.state, googleStateCookieSettings(cookieOptions));
      const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authorizeUrl.searchParams.set('client_id', options.google.clientId);
      authorizeUrl.searchParams.set('redirect_uri', options.google.redirectUri);
      authorizeUrl.searchParams.set('response_type', 'code');
      authorizeUrl.searchParams.set('scope', 'openid email profile');
      authorizeUrl.searchParams.set('state', state.state);
      authorizeUrl.searchParams.set('nonce', state.nonce);
      authorizeUrl.searchParams.set('prompt', 'select_account');
      response.redirect(authorizeUrl.toString());
    }),
    googleCallback: handler(async (request, response) => {
      const callbackError = typeof request.query.error === 'string' ? request.query.error : undefined;
      const state = typeof request.query.state === 'string' ? request.query.state : '';
      const code = typeof request.query.code === 'string' ? request.query.code : '';
      let destination = '/dashboard';
      try {
        if (callbackError || !state || !code || !isGoogleConfigured(options.google)) {
          throw new AuthError('GOOGLE_LOGIN_FAILED', 'Không thể đăng nhập với Google.', 400);
        }
        const loginState = options.service.consumeGoogleLoginState(
          state,
          getCookieValue(request, googleStateCookieName(cookieOptions)),
        );
        destination = loginState.redirectPath;
        const client = new OAuth2Client(options.google.clientId, options.google.clientSecret, options.google.redirectUri);
        const tokens = await client.getToken(code);
        if (!tokens.tokens.id_token) throw new AuthError('GOOGLE_LOGIN_FAILED', 'Google không trả về thông tin xác thực.', 400);
        const ticket = await client.verifyIdToken({ idToken: tokens.tokens.id_token, audience: options.google.clientId });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== loginState.nonce) {
          throw new AuthError('GOOGLE_LOGIN_FAILED', 'Không thể xác thực tài khoản Google.', 400);
        }
        const result = options.service.authenticateWithGoogle({
          subject: payload.sub,
          email: payload.email,
          name: payload.name,
        });
        setSessionCookie(response, result.sessionToken, cookieOptions);
        clearGoogleStateCookie(response, cookieOptions);
        response.redirect(appRedirectUrl(options.appUrl, destination));
      } catch (error) {
        clearGoogleStateCookie(response, cookieOptions);
        const authCode = error instanceof AuthError ? error.code : 'GOOGLE_LOGIN_FAILED';
        response.redirect(appRedirectUrl(options.appUrl, `/login?auth_error=${encodeURIComponent(authCode)}`));
      }
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
  router.post('/register', handlers.register);
  router.post('/login', handlers.login);
  router.post('/password-reset/request', handlers.passwordResetRequest);
  router.post('/password-reset/confirm', handlers.passwordResetConfirm);
  router.get('/providers', handlers.providers);
  router.get('/google/start', handlers.googleStart);
  router.get('/google/callback', handlers.googleCallback);
  router.get('/me', handlers.me);
  router.post('/logout', handlers.logout);
  return router;
};

export const authErrorHandler = (error: unknown, _request: Request, response: Response, next: NextFunction): void => {
  if (!(error instanceof AuthError)) {
    next(error);
    return;
  }

  const retryAfterSeconds = error.details?.retryAfterSeconds;
  if (typeof retryAfterSeconds === 'number') response.setHeader('Retry-After', String(retryAfterSeconds));

  response.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};
