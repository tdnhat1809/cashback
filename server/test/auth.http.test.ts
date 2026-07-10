import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import type { SqliteDatabase } from '../src/db/database.js';
import { openDatabase } from '../src/db/database.js';
import {
  AuthService,
  authErrorHandler,
  createAuthRouter,
  hashSessionToken,
} from '../src/modules/auth/index.js';

const databases: SqliteDatabase[] = [];

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

const createApp = () => {
  const database = openDatabase(':memory:');
  databases.push(database);
  let id = 0;
  const service = new AuthService({
    database,
    environment: 'development',
    devOtp: '123456',
    sessionTtlHours: 24,
    now: () => new Date('2026-07-10T10:00:00.000Z'),
    generateId: () => `http-id-${++id}`,
    generateToken: () => 'opaque-http-session-token',
  });
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', createAuthRouter({
    service,
    cookieName: 'hoantienvip_session',
    environment: 'development',
    sessionTtlHours: 24,
  }));
  app.use(authErrorHandler);
  app.use((_error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  });
  return { app, database };
};

describe('auth HTTP handlers', () => {
  it('runs login, current-user, and logout through an HttpOnly cookie', async () => {
    const { app, database } = createApp();
    const agent = request.agent(app);

    const requested = await agent.post('/auth/otp/request').send({ phone: '0912 345 678' }).expect(201);
    expect(requested.body.data).toMatchObject({ phone: '+84912345678', devCode: '123456' });

    const verified = await agent.post('/auth/otp/verify').send({
      challengeId: requested.body.data.challengeId,
      phone: requested.body.data.phone,
      code: '123456',
    }).expect(200);
    expect(verified.body.data.user.phone).toBe('+84912345678');
    expect(verified.body.data.sessionToken).toBeUndefined();
    expect(verified.headers['set-cookie']?.[0]).toContain('hoantienvip_session=opaque-http-session-token');
    expect(verified.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(verified.headers['set-cookie']?.[0]).toContain('SameSite=Lax');

    const stored = database.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(stored.token_hash).toBe(hashSessionToken('opaque-http-session-token'));
    await agent.get('/auth/me').expect(200).expect(({ body }) => {
      expect(body.data.user.phone).toBe('+84912345678');
    });

    const loggedOut = await agent.post('/auth/logout').expect(204);
    expect(loggedOut.headers['set-cookie']?.[0]).toContain('hoantienvip_session=;');
    await agent.get('/auth/me').expect(401).expect(({ body }) => {
      expect(body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  it('returns structured validation and rate-limit errors', async () => {
    const { app } = createApp();
    await request(app).post('/auth/otp/request').send({ phone: '' }).expect(400).expect(({ body }) => {
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.fields.phone).toBeDefined();
    });

    await request(app).post('/auth/otp/request').send({ phone: '0912345678' }).expect(201);
    const limited = await request(app).post('/auth/otp/request').send({ phone: '0912345678' }).expect(429);
    expect(limited.body.error.code).toBe('OTP_RATE_LIMITED');
    expect(limited.headers['retry-after']).toBe('60');
  });
});
