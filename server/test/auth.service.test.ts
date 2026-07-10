import type { SqliteDatabase } from '../src/db/database.js';
import { openDatabase } from '../src/db/database.js';
import {
  AuthError,
  AuthService,
  hashSessionToken,
  normalizeVietnamesePhone,
  verifyOtpCodeHash,
} from '../src/modules/auth/index.js';
import { afterEach, describe, expect, it } from 'vitest';

const databases: SqliteDatabase[] = [];

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

const createFixture = (overrides: Partial<ConstructorParameters<typeof AuthService>[0]> = {}) => {
  const database = openDatabase(':memory:');
  databases.push(database);
  let nowMs = Date.parse('2026-07-10T10:00:00.000Z');
  let id = 0;
  const service = new AuthService({
    database,
    environment: 'test',
    devOtp: '123456',
    sessionTtlHours: 24,
    now: () => new Date(nowMs),
    generateId: () => `deterministic-id-${++id}`,
    generateToken: () => `opaque-token-${id}`,
    ...overrides,
  });
  return {
    database,
    service,
    advance: (milliseconds: number) => {
      nowMs += milliseconds;
    },
  };
};

const expectAuthError = (run: () => unknown, code: string, status: number) => {
  try {
    run();
    throw new Error('Expected AuthError');
  } catch (error) {
    expect(error).toBeInstanceOf(AuthError);
    expect(error).toMatchObject({ code, status });
  }
};

describe('normalizeVietnamesePhone', () => {
  it.each([
    ['0912 345 678', '+84912345678'],
    ['0912.345.678', '+84912345678'],
    ['84 912 345 678', '+84912345678'],
    ['+84 (912) 345-678', '+84912345678'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeVietnamesePhone(input)).toBe(expected);
  });

  it.each(['', '0123456789', '84123456789', '+849123', '0912abc678'])('rejects %s', (input) => {
    expect(() => normalizeVietnamesePhone(input)).toThrow('Số điện thoại Việt Nam không hợp lệ.');
  });
});

describe('AuthService OTP lifecycle', () => {
  it('stores only a salted hash and exposes the fixed OTP only in development', () => {
    const fixture = createFixture({ environment: 'development' });
    const result = fixture.service.requestOtp({ phone: '0912 345 678' });

    expect(result).toMatchObject({
      challengeId: 'deterministic-id-1',
      phone: '+84912345678',
      purpose: 'login',
      devCode: '123456',
    });
    const row = fixture.database.prepare('SELECT code_hash FROM otp_challenges WHERE id = ?')
      .get(result.challengeId) as { code_hash: string };
    expect(row.code_hash).not.toContain('123456');
    expect(verifyOtpCodeHash('123456', row.code_hash)).toBe(true);

    const testFixture = createFixture();
    expect(testFixture.service.requestOtp({ phone: '0912345678' }).devCode).toBeUndefined();
  });

  it('fails closed in production until a real OTP delivery provider is configured', () => {
    const fixture = createFixture({ environment: 'production' });
    expectAuthError(
      () => fixture.service.requestOtp({ phone: '0912345678' }),
      'OTP_DELIVERY_UNAVAILABLE',
      503,
    );
    expectAuthError(
      () => fixture.service.verifyOtp({ challengeId: 'none', phone: '0912345678', code: '123456' }),
      'OTP_DELIVERY_UNAVAILABLE',
      503,
    );
    expect((fixture.database.prepare('SELECT COUNT(*) AS count FROM otp_challenges').get() as { count: number }).count)
      .toBe(0);
  });

  it('enforces persisted cooldown and rolling-window request limits', () => {
    const fixture = createFixture({
      otpCooldownMs: 1_000,
      otpRateLimitWindowMs: 10_000,
      otpMaxRequestsPerWindow: 2,
    });
    fixture.service.requestOtp({ phone: '0912345678' });
    expectAuthError(() => fixture.service.requestOtp({ phone: '0912345678' }), 'OTP_RATE_LIMITED', 429);

    fixture.advance(1_000);
    fixture.service.requestOtp({ phone: '0912345678' });
    fixture.advance(1_000);
    expectAuthError(() => fixture.service.requestOtp({ phone: '0912345678' }), 'OTP_RATE_LIMITED', 429);
    expect((fixture.database.prepare('SELECT COUNT(*) AS count FROM otp_challenges').get() as { count: number }).count)
      .toBe(2);

    fixture.advance(9_001);
    expect(() => fixture.service.requestOtp({ phone: '0912345678' })).not.toThrow();
  });

  it('persists failed attempts and locks the challenge', () => {
    const fixture = createFixture({ otpMaxVerifyAttempts: 2 });
    const challenge = fixture.service.requestOtp({ phone: '0912345678' });

    expectAuthError(
      () => fixture.service.verifyOtp({ challengeId: challenge.challengeId, phone: challenge.phone, code: '000000' }),
      'OTP_INCORRECT',
      400,
    );
    expectAuthError(
      () => fixture.service.verifyOtp({ challengeId: challenge.challengeId, phone: challenge.phone, code: '111111' }),
      'OTP_INCORRECT',
      400,
    );
    expectAuthError(
      () => fixture.service.verifyOtp({ challengeId: challenge.challengeId, phone: challenge.phone, code: '123456' }),
      'OTP_ATTEMPTS_EXCEEDED',
      429,
    );
    expect((fixture.database.prepare('SELECT attempts FROM otp_challenges WHERE id = ?').get(challenge.challengeId) as { attempts: number }).attempts)
      .toBe(2);
  });

  it('creates a user and opaque session, resolves current user, and logs out idempotently', () => {
    const fixture = createFixture();
    const challenge = fixture.service.requestOtp({ phone: '0912345678' });
    const verified = fixture.service.verifyOtp({
      challengeId: challenge.challengeId,
      phone: '84 912 345 678',
      code: '123456',
    });

    expect(verified.user).toMatchObject({ phone: '+84912345678', role: 'user', status: 'active' });
    expect(verified.sessionToken).toMatch(/^opaque-token-/);
    const session = fixture.database.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(session.token_hash).toBe(hashSessionToken(verified.sessionToken));
    expect(session.token_hash).not.toBe(verified.sessionToken);
    expect(fixture.service.getCurrentUser(verified.sessionToken).id).toBe(verified.user.id);

    fixture.service.logout(verified.sessionToken);
    fixture.service.logout(verified.sessionToken);
    expectAuthError(() => fixture.service.getCurrentUser(verified.sessionToken), 'AUTH_REQUIRED', 401);
  });

  it('expires and removes old sessions', () => {
    const fixture = createFixture({ sessionTtlHours: 1 });
    const challenge = fixture.service.requestOtp({ phone: '0912345678' });
    const verified = fixture.service.verifyOtp({
      challengeId: challenge.challengeId,
      phone: challenge.phone,
      code: '123456',
    });
    fixture.advance(60 * 60 * 1_000 + 1);

    expectAuthError(() => fixture.service.getCurrentUser(verified.sessionToken), 'SESSION_EXPIRED', 401);
    expect((fixture.database.prepare('SELECT COUNT(*) AS count FROM sessions').get() as { count: number }).count)
      .toBe(0);
  });
});
