import { randomInt, randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '../../db/database.js';
import type { OtpDelivery } from './delivery.js';
import {
  createOpaqueToken,
  hashOtpCode,
  hashPassword,
  hashSessionToken,
  verifyOtpCodeHash,
  verifyPasswordHash,
} from './crypto.js';
import { InvalidVietnamesePhoneError, normalizeVietnamesePhone } from './phone.js';

export type AuthEnvironment = 'development' | 'test' | 'production';
export type OtpPurpose = 'login' | 'password_reset';

export interface AuthUser {
  id: string;
  publicId: string;
  phone: string | null;
  email: string | null;
  name: string;
  role: 'user' | 'support' | 'operation' | 'finance' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface RequestOtpInput {
  phone: string;
  purpose?: OtpPurpose;
}

export interface RequestOtpResult {
  challengeId: string;
  phone: string;
  purpose: OtpPurpose;
  expiresAt: string;
  retryAfterSeconds: number;
  /** Present only in development so it can never leak from production/test HTTP responses. */
  devCode?: string;
}

export interface VerifyOtpInput {
  challengeId: string;
  phone: string;
  code: string;
  purpose?: OtpPurpose;
}

export interface VerifyOtpResult {
  user: AuthUser;
  sessionToken: string;
  sessionExpiresAt: string;
}

export interface PasswordRegistrationInput {
  email: string;
  password: string;
  name: string;
}

export interface PasswordLoginInput {
  email: string;
  password: string;
}

export interface GoogleIdentityInput {
  subject: string;
  email: string;
  name?: string;
}

export interface GoogleLoginState {
  state: string;
  nonce: string;
}

export interface ConsumedGoogleLoginState {
  nonce: string;
  redirectPath: string;
}

export interface AuthServiceOptions {
  database: SqliteDatabase;
  environment: AuthEnvironment;
  devOtp: string;
  sessionTtlHours: number;
  now?: () => Date;
  generateId?: () => string;
  generateToken?: () => string;
  otpTtlMs?: number;
  otpCooldownMs?: number;
  otpRateLimitWindowMs?: number;
  otpMaxRequestsPerWindow?: number;
  otpMaxVerifyAttempts?: number;
  delivery?: OtpDelivery;
  generateOtp?: () => string;
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface UserRow {
  id: string;
  public_id: string;
  phone: string;
  email: string | null;
  name: string;
  role: AuthUser['role'];
  status: AuthUser['status'];
  created_at: string;
  updated_at: string;
}

interface OtpChallengeRow {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

interface SessionUserRow extends UserRow {
  session_id: string;
  session_expires_at: string;
}

interface PasswordIdentityRow extends UserRow {
  password_hash: string;
}

interface GoogleIdentityRow extends UserRow {}

interface LoginAttemptRow {
  failures: number;
  first_failed_at: string;
  locked_until: string | null;
}

interface GoogleStateRow {
  nonce: string;
  redirect_path: string;
  expires_at: string;
}

const toAuthUser = (row: UserRow): AuthUser => ({
  id: row.id,
  publicId: row.public_id,
  phone: row.phone.startsWith('identity:') ? null : row.phone,
  email: row.email,
  name: row.name,
  role: row.role,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizePhoneOrThrow = (phone: string): string => {
  try {
    return normalizeVietnamesePhone(phone);
  } catch (error) {
    if (error instanceof InvalidVietnamesePhoneError) {
      throw new AuthError('INVALID_PHONE', error.message, 400);
    }
    throw error;
  }
};

const assertOtpCode = (code: string): string => {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    throw new AuthError('INVALID_OTP', 'Mã OTP phải gồm 6 chữ số.', 400);
  }
  return trimmed;
};

const normalizeEmailOrThrow = (email: string): string => {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AuthError('INVALID_EMAIL', 'Địa chỉ email không hợp lệ.', 400);
  }
  return normalized;
};

const assertPassword = (password: string): string => {
  if (password.length < 10 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AuthError('WEAK_PASSWORD', 'Mật khẩu cần từ 10–128 ký tự và có cả chữ lẫn số.', 400);
  }
  return password;
};

const normalizeRedirectPath = (redirectPath: string): string =>
  redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/dashboard';

export class AuthService {
  private readonly database: SqliteDatabase;
  private readonly environment: AuthEnvironment;
  private readonly devOtp: string;
  private readonly sessionTtlMs: number;
  private readonly now: () => Date;
  private readonly generateId: () => string;
  private readonly generateToken: () => string;
  private readonly otpTtlMs: number;
  private readonly otpCooldownMs: number;
  private readonly otpRateLimitWindowMs: number;
  private readonly otpMaxRequestsPerWindow: number;
  private readonly otpMaxVerifyAttempts: number;
  private readonly delivery?: OtpDelivery;
  private readonly generateOtp: () => string;
  private readonly passwordLoginWindowMs = 15 * 60 * 1_000;
  private readonly passwordLoginMaxFailures = 5;

  constructor(options: AuthServiceOptions) {
    if (!/^\d{6}$/.test(options.devOtp)) throw new Error('devOtp must contain exactly 6 digits');
    if (!Number.isInteger(options.sessionTtlHours) || options.sessionTtlHours <= 0) {
      throw new Error('sessionTtlHours must be a positive integer');
    }

    this.database = options.database;
    this.environment = options.environment;
    this.devOtp = options.devOtp;
    this.sessionTtlMs = options.sessionTtlHours * 60 * 60 * 1_000;
    this.now = options.now ?? (() => new Date());
    this.generateId = options.generateId ?? randomUUID;
    this.generateToken = options.generateToken ?? createOpaqueToken;
    this.otpTtlMs = options.otpTtlMs ?? 5 * 60 * 1_000;
    this.otpCooldownMs = options.otpCooldownMs ?? 60 * 1_000;
    this.otpRateLimitWindowMs = options.otpRateLimitWindowMs ?? 15 * 60 * 1_000;
    this.otpMaxRequestsPerWindow = options.otpMaxRequestsPerWindow ?? 5;
    this.otpMaxVerifyAttempts = options.otpMaxVerifyAttempts ?? 5;
    this.delivery = options.delivery;
    this.generateOtp = options.generateOtp ?? (() => String(randomInt(100_000, 1_000_000)));
  }

  async requestOtp(input: RequestOtpInput): Promise<RequestOtpResult> {
    this.assertOtpDeliveryAvailable();
    const phone = normalizePhoneOrThrow(input.phone);
    const purpose = input.purpose ?? 'login';
    const now = this.now();
    const nowIso = now.toISOString();
    const windowStartIso = new Date(now.getTime() - this.otpRateLimitWindowMs).toISOString();

    const code = this.environment === 'production' ? this.generateOtp() : this.devOtp;
    if (!/^\d{6}$/.test(code)) throw new Error('generateOtp must return exactly 6 digits');
    const result = this.database.transaction(() => {
      const recent = this.database.prepare(`
        SELECT created_at
        FROM otp_challenges
        WHERE phone = ? AND purpose = ? AND created_at >= ?
        ORDER BY created_at DESC
      `).all(phone, purpose, windowStartIso) as Array<{ created_at: string }>;

      const latestCreatedAt = recent[0]?.created_at;
      if (latestCreatedAt) {
        const elapsedMs = now.getTime() - new Date(latestCreatedAt).getTime();
        if (elapsedMs < this.otpCooldownMs) {
          const retryAfterSeconds = Math.max(1, Math.ceil((this.otpCooldownMs - elapsedMs) / 1_000));
          throw new AuthError('OTP_RATE_LIMITED', 'Vui lòng chờ trước khi yêu cầu mã OTP mới.', 429, {
            retryAfterSeconds,
          });
        }
      }

      if (recent.length >= this.otpMaxRequestsPerWindow) {
        const oldest = recent[recent.length - 1];
        const oldestCreatedAt = oldest ? new Date(oldest.created_at).getTime() : now.getTime();
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldestCreatedAt + this.otpRateLimitWindowMs - now.getTime()) / 1_000),
        );
        throw new AuthError('OTP_RATE_LIMITED', 'Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng thử lại sau.', 429, {
          retryAfterSeconds,
        });
      }

      const challengeId = this.generateId();
      const expiresAt = new Date(now.getTime() + this.otpTtlMs).toISOString();
      this.database.prepare(`
        INSERT INTO otp_challenges(id, phone, purpose, code_hash, attempts, expires_at, consumed_at, created_at)
        VALUES (?, ?, ?, ?, 0, ?, NULL, ?)
      `).run(challengeId, phone, purpose, hashOtpCode(code), expiresAt, nowIso);

      return {
        challengeId,
        phone,
        purpose,
        expiresAt,
        retryAfterSeconds: Math.ceil(this.otpCooldownMs / 1_000),
        ...(this.environment === 'development' ? { devCode: this.devOtp } : {}),
      };
    })();

    if (this.environment === 'production') {
      try {
        await this.delivery!.send({ phone, code, purpose, expiresAt: result.expiresAt });
      } catch {
        this.database.prepare('DELETE FROM otp_challenges WHERE id = ? AND consumed_at IS NULL').run(result.challengeId);
        throw new AuthError('OTP_DELIVERY_UNAVAILABLE', 'Không thể gửi mã OTP. Vui lòng thử lại sau.', 503);
      }
    }
    return result;
  }

  verifyOtp(input: VerifyOtpInput): VerifyOtpResult {
    this.assertOtpDeliveryAvailable();
    const phone = normalizePhoneOrThrow(input.phone);
    const code = assertOtpCode(input.code);
    const purpose = input.purpose ?? 'login';
    const now = this.now();
    const nowIso = now.toISOString();

    const result = this.database.transaction((): VerifyOtpResult | { failure: AuthError } => {
      const challenge = this.database.prepare(`
        SELECT id, phone, purpose, code_hash, attempts, expires_at, consumed_at, created_at
        FROM otp_challenges
        WHERE id = ? AND phone = ? AND purpose = ?
      `).get(input.challengeId, phone, purpose) as OtpChallengeRow | undefined;

      if (!challenge || challenge.consumed_at) {
        throw new AuthError('OTP_CHALLENGE_INVALID', 'Yêu cầu OTP không hợp lệ hoặc đã được sử dụng.', 400);
      }
      if (new Date(challenge.expires_at).getTime() <= now.getTime()) {
        throw new AuthError('OTP_EXPIRED', 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.', 400);
      }
      if (challenge.attempts >= this.otpMaxVerifyAttempts) {
        throw new AuthError('OTP_ATTEMPTS_EXCEEDED', 'Bạn đã nhập sai OTP quá số lần cho phép.', 429);
      }

      this.database.prepare('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?').run(challenge.id);
      if (!verifyOtpCodeHash(code, challenge.code_hash)) {
        const attemptsRemaining = Math.max(0, this.otpMaxVerifyAttempts - challenge.attempts - 1);
        return {
          failure: new AuthError('OTP_INCORRECT', 'Mã OTP không chính xác.', 400, { attemptsRemaining }),
        };
      }

      const existingUser = this.database.prepare(`
        SELECT id, public_id, phone, email, name, role, status, created_at, updated_at
        FROM users WHERE phone = ?
      `).get(phone) as UserRow | undefined;

      if (!existingUser && purpose === 'password_reset') {
        throw new AuthError('OTP_CHALLENGE_INVALID', 'Yêu cầu OTP không hợp lệ hoặc đã hết hạn.', 400);
      }

      const user = existingUser ?? this.createUser(phone, nowIso);
      if (user.status === 'suspended') {
        throw new AuthError('ACCOUNT_SUSPENDED', 'Tài khoản đã bị tạm khóa.', 403);
      }

      this.database.prepare('UPDATE otp_challenges SET consumed_at = ? WHERE id = ?').run(nowIso, challenge.id);

      const sessionToken = this.generateToken();
      const sessionExpiresAt = new Date(now.getTime() + this.sessionTtlMs).toISOString();
      this.database.prepare(`
        INSERT INTO sessions(id, user_id, token_hash, expires_at, last_seen_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(this.generateId(), user.id, hashSessionToken(sessionToken), sessionExpiresAt, nowIso, nowIso);

      return { user: toAuthUser(user), sessionToken, sessionExpiresAt };
    })();

    if ('failure' in result) throw result.failure;
    return result;
  }

  registerWithPassword(input: PasswordRegistrationInput): VerifyOtpResult {
    const email = normalizeEmailOrThrow(input.email);
    const password = assertPassword(input.password);
    const name = input.name.trim();
    if (name.length < 2 || name.length > 100) {
      throw new AuthError('INVALID_NAME', 'Họ và tên cần có từ 2 đến 100 ký tự.', 400);
    }
    const now = this.now();
    const timestamp = now.toISOString();

    try {
      return this.database.transaction(() => {
        const existing = this.database.prepare(`
          SELECT 1 FROM users WHERE email = ?
          UNION ALL SELECT 1 FROM auth_identities WHERE email = ?
          LIMIT 1
        `).get(email, email);
        if (existing) throw new AuthError('EMAIL_ALREADY_REGISTERED', 'Email này đã được đăng ký. Hãy đăng nhập để tiếp tục.', 409);

        const user = this.createEmailUser({ email, name, nowIso: timestamp });
        this.database.prepare(`
          INSERT INTO auth_identities(id, user_id, provider, provider_subject, email, password_hash, created_at, updated_at)
          VALUES (?, ?, 'password', ?, ?, ?, ?, ?)
        `).run(this.generateId(), user.id, email, email, hashPassword(password), timestamp, timestamp);
        this.database.prepare('DELETE FROM password_login_attempts WHERE email = ?').run(email);
        return this.createSessionForUser(user, now);
      })();
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new AuthError('EMAIL_ALREADY_REGISTERED', 'Email này đã được đăng ký. Hãy đăng nhập để tiếp tục.', 409);
      }
      throw error;
    }
  }

  loginWithPassword(input: PasswordLoginInput): VerifyOtpResult {
    const email = normalizeEmailOrThrow(input.email);
    const password = typeof input.password === 'string' ? input.password : '';
    const now = this.now();

    return this.database.transaction(() => {
      const attempt = this.database.prepare(`
        SELECT failures, first_failed_at, locked_until FROM password_login_attempts WHERE email = ?
      `).get(email) as LoginAttemptRow | undefined;
      if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > now.getTime()) {
        const retryAfterSeconds = Math.max(1, Math.ceil((new Date(attempt.locked_until).getTime() - now.getTime()) / 1_000));
        throw new AuthError('AUTH_RATE_LIMITED', 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.', 429, { retryAfterSeconds });
      }

      const identity = this.database.prepare(`
        SELECT u.id, u.public_id, u.phone, u.email, u.name, u.role, u.status, u.created_at, u.updated_at,
               ai.password_hash
        FROM auth_identities ai INNER JOIN users u ON u.id = ai.user_id
        WHERE ai.provider = 'password' AND ai.email = ?
      `).get(email) as PasswordIdentityRow | undefined;

      if (!identity || !identity.password_hash || !verifyPasswordHash(password, identity.password_hash)) {
        this.recordPasswordFailure(email, now, attempt);
        throw new AuthError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.', 401);
      }
      if (identity.status === 'suspended') {
        throw new AuthError('ACCOUNT_SUSPENDED', 'Tài khoản đang bị tạm khóa. Vui lòng liên hệ hỗ trợ.', 403);
      }
      this.database.prepare('DELETE FROM password_login_attempts WHERE email = ?').run(email);
      return this.createSessionForUser(identity, now);
    })();
  }

  beginGoogleLogin(redirectPath: string): GoogleLoginState {
    const now = this.now();
    const state = this.generateToken();
    const nonce = this.generateToken();
    this.database.prepare('DELETE FROM google_oauth_states WHERE expires_at <= ?').run(now.toISOString());
    this.database.prepare(`
      INSERT INTO google_oauth_states(state_hash, nonce, redirect_path, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      hashSessionToken(state), nonce, normalizeRedirectPath(redirectPath),
      new Date(now.getTime() + 10 * 60 * 1_000).toISOString(), now.toISOString(),
    );
    return { state, nonce };
  }

  consumeGoogleLoginState(state: string, cookieState: string | undefined): ConsumedGoogleLoginState {
    if (!cookieState || cookieState !== state) {
      throw new AuthError('GOOGLE_STATE_INVALID', 'Phiên đăng nhập Google không hợp lệ. Vui lòng thử lại.', 400);
    }
    const now = this.now();
    return this.database.transaction(() => {
      const stateHash = hashSessionToken(state);
      const row = this.database.prepare(`
        SELECT nonce, redirect_path, expires_at FROM google_oauth_states WHERE state_hash = ?
      `).get(stateHash) as GoogleStateRow | undefined;
      this.database.prepare('DELETE FROM google_oauth_states WHERE state_hash = ?').run(stateHash);
      if (!row || new Date(row.expires_at).getTime() <= now.getTime()) {
        throw new AuthError('GOOGLE_STATE_INVALID', 'Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.', 400);
      }
      return { nonce: row.nonce, redirectPath: normalizeRedirectPath(row.redirect_path) };
    })();
  }

  authenticateWithGoogle(input: GoogleIdentityInput): VerifyOtpResult {
    const subject = input.subject.trim();
    const email = normalizeEmailOrThrow(input.email);
    if (!subject || subject.length > 255) throw new AuthError('GOOGLE_IDENTITY_INVALID', 'Tài khoản Google không hợp lệ.', 400);
    const fallbackName = email.split('@')[0] ?? 'Thành viên';
    const name = input.name?.trim().slice(0, 100) || fallbackName;
    const now = this.now();
    const timestamp = now.toISOString();

    try {
      return this.database.transaction(() => {
        const existingGoogle = this.database.prepare(`
          SELECT u.id, u.public_id, u.phone, u.email, u.name, u.role, u.status, u.created_at, u.updated_at
          FROM auth_identities ai INNER JOIN users u ON u.id = ai.user_id
          WHERE ai.provider = 'google' AND ai.provider_subject = ?
        `).get(subject) as GoogleIdentityRow | undefined;
        if (existingGoogle) {
          if (existingGoogle.status === 'suspended') {
            throw new AuthError('ACCOUNT_SUSPENDED', 'Tài khoản đang bị tạm khóa. Vui lòng liên hệ hỗ trợ.', 403);
          }
          return this.createSessionForUser(existingGoogle, now);
        }

        const emailInUse = this.database.prepare(`
          SELECT 1 FROM users WHERE email = ?
          UNION ALL SELECT 1 FROM auth_identities WHERE email = ?
          LIMIT 1
        `).get(email, email);
        if (emailInUse) {
          throw new AuthError('EMAIL_ALREADY_REGISTERED', 'Email này đã có tài khoản. Hãy đăng nhập bằng phương thức đã đăng ký.', 409);
        }

        const user = this.createEmailUser({ email, name, nowIso: timestamp });
        this.database.prepare(`
          INSERT INTO auth_identities(id, user_id, provider, provider_subject, email, password_hash, created_at, updated_at)
          VALUES (?, ?, 'google', ?, ?, NULL, ?, ?)
        `).run(this.generateId(), user.id, subject, email, timestamp, timestamp);
        return this.createSessionForUser(user, now);
      })();
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new AuthError('EMAIL_ALREADY_REGISTERED', 'Email này đã có tài khoản. Hãy đăng nhập bằng phương thức đã đăng ký.', 409);
      }
      throw error;
    }
  }

  getCurrentUser(sessionToken: string | undefined): AuthUser {
    if (!sessionToken) throw new AuthError('AUTH_REQUIRED', 'Bạn cần đăng nhập để tiếp tục.', 401);

    const tokenHash = hashSessionToken(sessionToken);
    const row = this.database.prepare(`
      SELECT
        u.id, u.public_id, u.phone, u.email, u.name, u.role, u.status, u.created_at, u.updated_at,
        s.id AS session_id, s.expires_at AS session_expires_at
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
    `).get(tokenHash) as SessionUserRow | undefined;

    if (!row) throw new AuthError('AUTH_REQUIRED', 'Phiên đăng nhập không hợp lệ.', 401);
    const now = this.now();
    if (new Date(row.session_expires_at).getTime() <= now.getTime()) {
      this.database.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
      throw new AuthError('SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn.', 401);
    }
    if (row.status === 'suspended') {
      this.database.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
      throw new AuthError('ACCOUNT_SUSPENDED', 'Tài khoản đã bị tạm khóa.', 403);
    }

    this.database.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now.toISOString(), row.session_id);
    return toAuthUser(row);
  }

  logout(sessionToken: string | undefined): void {
    if (!sessionToken) return;
    this.database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(sessionToken));
  }

  private createUser(phone: string, nowIso: string): UserRow {
    const id = this.generateId();
    const publicId = `HTV${this.generateId().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const user: UserRow = {
      id,
      public_id: publicId,
      phone,
      email: null,
      name: `Thành viên ${phone.slice(-4)}`,
      role: 'user',
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.database.prepare(`
      INSERT INTO users(id, public_id, phone, email, name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, 'user', 'active', ?, ?)
    `).run(user.id, user.public_id, user.phone, user.name, user.created_at, user.updated_at);
    return user;
  }

  private createEmailUser(input: { email: string; name: string; nowIso: string }): UserRow {
    const id = this.generateId();
    const user: UserRow = {
      id,
      public_id: `HTV${this.generateId().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      phone: `identity:${this.generateId()}`,
      email: input.email,
      name: input.name,
      role: 'user',
      status: 'active',
      created_at: input.nowIso,
      updated_at: input.nowIso,
    };
    this.database.prepare(`
      INSERT INTO users(id, public_id, phone, email, name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'user', 'active', ?, ?)
    `).run(user.id, user.public_id, user.phone, user.email, user.name, user.created_at, user.updated_at);
    return user;
  }

  private createSessionForUser(user: UserRow, now: Date): VerifyOtpResult {
    const sessionToken = this.generateToken();
    const nowIso = now.toISOString();
    const sessionExpiresAt = new Date(now.getTime() + this.sessionTtlMs).toISOString();
    this.database.prepare(`
      INSERT INTO sessions(id, user_id, token_hash, expires_at, last_seen_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(this.generateId(), user.id, hashSessionToken(sessionToken), sessionExpiresAt, nowIso, nowIso);
    return { user: toAuthUser(user), sessionToken, sessionExpiresAt };
  }

  private recordPasswordFailure(email: string, now: Date, existing: LoginAttemptRow | undefined): void {
    const timestamp = now.toISOString();
    const firstFailedAt = existing && now.getTime() - new Date(existing.first_failed_at).getTime() < this.passwordLoginWindowMs
      ? existing.first_failed_at
      : timestamp;
    const failures = existing && firstFailedAt === existing.first_failed_at ? existing.failures + 1 : 1;
    const lockedUntil = failures >= this.passwordLoginMaxFailures
      ? new Date(now.getTime() + this.passwordLoginWindowMs).toISOString()
      : null;
    this.database.prepare(`
      INSERT INTO password_login_attempts(email, failures, first_failed_at, locked_until, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        failures = excluded.failures,
        first_failed_at = excluded.first_failed_at,
        locked_until = excluded.locked_until,
        updated_at = excluded.updated_at
    `).run(email, failures, firstFailedAt, lockedUntil, timestamp);
  }

  private assertOtpDeliveryAvailable(): void {
    if (this.environment === 'production' && !this.delivery) {
      throw new AuthError(
        'OTP_DELIVERY_UNAVAILABLE',
        'Dịch vụ gửi OTP chưa được cấu hình cho môi trường production.',
        503,
      );
    }
  }
}
