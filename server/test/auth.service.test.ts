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

const expectAuthError = async (run: () => unknown | Promise<unknown>, code: string, status: number) => {
  try {
    await run();
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
  it('stores only a salted hash and exposes the fixed OTP only in development', async () => {
    const fixture = createFixture({ environment: 'development' });
    const result = await fixture.service.requestOtp({ phone: '0912 345 678' });

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
    expect((await testFixture.service.requestOtp({ phone: '0912345678' })).devCode).toBeUndefined();
  });

  it('fails closed in production until a real OTP delivery provider is configured', async () => {
    const fixture = createFixture({ environment: 'production' });
    await expectAuthError(
      () => fixture.service.requestOtp({ phone: '0912345678' }),
      'OTP_DELIVERY_UNAVAILABLE',
      503,
    );
    await expectAuthError(
      () => fixture.service.verifyOtp({ challengeId: 'none', phone: '0912345678', code: '123456' }),
      'OTP_DELIVERY_UNAVAILABLE',
      503,
    );
    expect((fixture.database.prepare('SELECT COUNT(*) AS count FROM otp_challenges').get() as { count: number }).count)
      .toBe(0);
  });

  it('delivers a generated production OTP through the configured delivery adapter without exposing it', async () => {
    const delivered: Array<{ phone: string; code: string }> = [];
    const fixture = createFixture({
      environment: 'production',
      generateOtp: () => '654321',
      delivery: { send: async (input) => { delivered.push({ phone: input.phone, code: input.code }); } },
    });
    const challenge = await fixture.service.requestOtp({ phone: '0912345678' });
    expect(challenge.devCode).toBeUndefined();
    expect(delivered).toEqual([{ phone: '+84912345678', code: '654321' }]);
    const verified = fixture.service.verifyOtp({ challengeId: challenge.challengeId, phone: challenge.phone, code: '654321' });
    expect(verified.user.phone).toBe('+84912345678');
  });

  it('enforces persisted cooldown and rolling-window request limits', async () => {
    const fixture = createFixture({
      otpCooldownMs: 1_000,
      otpRateLimitWindowMs: 10_000,
      otpMaxRequestsPerWindow: 2,
    });
    await fixture.service.requestOtp({ phone: '0912345678' });
    await expectAuthError(() => fixture.service.requestOtp({ phone: '0912345678' }), 'OTP_RATE_LIMITED', 429);

    fixture.advance(1_000);
    await fixture.service.requestOtp({ phone: '0912345678' });
    fixture.advance(1_000);
    await expectAuthError(() => fixture.service.requestOtp({ phone: '0912345678' }), 'OTP_RATE_LIMITED', 429);
    expect((fixture.database.prepare('SELECT COUNT(*) AS count FROM otp_challenges').get() as { count: number }).count)
      .toBe(2);

    fixture.advance(9_001);
    await expect(fixture.service.requestOtp({ phone: '0912345678' })).resolves.toBeDefined();
  });

  it('persists failed attempts and locks the challenge', async () => {
    const fixture = createFixture({ otpMaxVerifyAttempts: 2 });
    const challenge = await fixture.service.requestOtp({ phone: '0912345678' });

    await expectAuthError(
      () => fixture.service.verifyOtp({ challengeId: challenge.challengeId, phone: challenge.phone, code: '000000' }),
      'OTP_INCORRECT',
      400,
    );
    await expectAuthError(
      () => fixture.service.verifyOtp({ challengeId: challenge.challengeId, phone: challenge.phone, code: '111111' }),
      'OTP_INCORRECT',
      400,
    );
    await expectAuthError(
      () => fixture.service.verifyOtp({ challengeId: challenge.challengeId, phone: challenge.phone, code: '123456' }),
      'OTP_ATTEMPTS_EXCEEDED',
      429,
    );
    expect((fixture.database.prepare('SELECT attempts FROM otp_challenges WHERE id = ?').get(challenge.challengeId) as { attempts: number }).attempts)
      .toBe(2);
  });

  it('creates a user and opaque session, resolves current user, and logs out idempotently', async () => {
    const fixture = createFixture();
    const challenge = await fixture.service.requestOtp({ phone: '0912345678' });
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
    await expectAuthError(() => fixture.service.getCurrentUser(verified.sessionToken), 'AUTH_REQUIRED', 401);
  });

  it('expires and removes old sessions', async () => {
    const fixture = createFixture({ sessionTtlHours: 1 });
    const challenge = await fixture.service.requestOtp({ phone: '0912345678' });
    const verified = fixture.service.verifyOtp({
      challengeId: challenge.challengeId,
      phone: challenge.phone,
      code: '123456',
    });
    fixture.advance(60 * 60 * 1_000 + 1);

    await expectAuthError(() => fixture.service.getCurrentUser(verified.sessionToken), 'SESSION_EXPIRED', 401);
    expect((fixture.database.prepare('SELECT COUNT(*) AS count FROM sessions').get() as { count: number }).count)
      .toBe(0);
  });
});

describe('AuthService email and Google authentication', () => {
  it('registers with email and password without exposing an internal phone identifier', async () => {
    const fixture = createFixture();
    const registered = fixture.service.registerWithPassword({
      name: 'Nguyễn Văn A', email: 'MEMBER@example.com', password: 'Password1234',
    });
    expect(registered.user).toMatchObject({ email: 'member@example.com', name: 'Nguyễn Văn A', phone: null });
    expect(fixture.service.getCurrentUser(registered.sessionToken).email).toBe('member@example.com');
    expect((fixture.database.prepare('SELECT phone FROM users WHERE id = ?').get(registered.user.id) as { phone: string }).phone)
      .toMatch(/^identity:/);
    await expectAuthError(
      () => fixture.service.registerWithPassword({ name: 'Trùng Email', email: 'member@example.com', password: 'Password1234' }),
      'EMAIL_ALREADY_REGISTERED',
      409,
    );

    const loggedIn = fixture.service.loginWithPassword({ email: 'member@example.com', password: 'Password1234' });
    expect(loggedIn.user.id).toBe(registered.user.id);
  });

  it('locks repeated invalid password attempts without revealing whether the email exists', async () => {
    const fixture = createFixture();
    fixture.service.registerWithPassword({ name: 'Người dùng', email: 'member@example.com', password: 'Password1234' });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expectAuthError(
        () => fixture.service.loginWithPassword({ email: 'member@example.com', password: 'wrong-password' }),
        'INVALID_CREDENTIALS',
        401,
      );
    }
    await expectAuthError(
      () => fixture.service.loginWithPassword({ email: 'member@example.com', password: 'Password1234' }),
      'AUTH_RATE_LIMITED',
      429,
    );
  });

  it('creates one-time Google state and uses Google subject as the account identity', async () => {
    const fixture = createFixture();
    const loginState = fixture.service.beginGoogleLogin('/dashboard/referral');
    await expectAuthError(
      () => fixture.service.consumeGoogleLoginState(loginState.state, 'wrong-state'),
      'GOOGLE_STATE_INVALID',
      400,
    );
    const consumed = fixture.service.consumeGoogleLoginState(loginState.state, loginState.state);
    expect(consumed).toMatchObject({ nonce: loginState.nonce, redirectPath: '/dashboard/referral' });
    await expectAuthError(
      () => fixture.service.consumeGoogleLoginState(loginState.state, loginState.state),
      'GOOGLE_STATE_INVALID',
      400,
    );

    const first = fixture.service.authenticateWithGoogle({ subject: 'google-subject-1', email: 'google@example.com', name: 'Google User' });
    const repeat = fixture.service.authenticateWithGoogle({ subject: 'google-subject-1', email: 'google@example.com', name: 'Changed Name' });
    expect(first.user).toMatchObject({ phone: null, email: 'google@example.com', name: 'Google User' });
    expect(repeat.user.id).toBe(first.user.id);
  });
});
