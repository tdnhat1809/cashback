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
    appUrl: 'http://localhost:5173',
    google: { clientId: '', clientSecret: '', redirectUri: '' },
  }));
  app.use(authErrorHandler);
  app.use((_error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  });
  return { app, database };
};

describe('auth HTTP handlers', () => {
  it('registers, logs in, and logs out through an HttpOnly cookie', async () => {
    const { app, database } = createApp();
    const agent = request.agent(app);

    const registered = await agent.post('/auth/register').send({
      name: 'Nguyễn Văn A', email: 'member@example.com', password: 'Password1234',
    }).expect(201);
    expect(registered.body.data.user).toMatchObject({ email: 'member@example.com', phone: null, name: 'Nguyễn Văn A' });
    expect(registered.body.data.sessionToken).toBeUndefined();
    expect(registered.headers['set-cookie']?.[0]).toContain('hoantienvip_session=opaque-http-session-token');
    expect(registered.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(registered.headers['set-cookie']?.[0]).toContain('SameSite=Lax');

    const stored = database.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(stored.token_hash).toBe(hashSessionToken('opaque-http-session-token'));
    await agent.get('/auth/me').expect(200).expect(({ body }) => {
      expect(body.data.user.email).toBe('member@example.com');
    });

    const loggedOut = await agent.post('/auth/logout').expect(204);
    expect(loggedOut.headers['set-cookie']?.[0]).toContain('hoantienvip_session=;');
    await agent.get('/auth/me').expect(401).expect(({ body }) => {
      expect(body.error.code).toBe('AUTH_REQUIRED');
    });

    await agent.post('/auth/login').send({ email: 'member@example.com', password: 'Password1234' }).expect(200);
  });

  it('returns structured validation, credential, and Google-provider responses', async () => {
    const { app } = createApp();
    await request(app).post('/auth/register').send({ name: 'A', email: 'not-email', password: 'short' }).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('VALIDATION_ERROR'));
    await request(app).post('/auth/register').send({
      name: 'Người dùng', email: 'member@example.com', password: 'Password1234',
    }).expect(201);
    await request(app).post('/auth/login').send({ email: 'member@example.com', password: 'wrong-password' }).expect(401)
      .expect(({ body }) => expect(body.error.code).toBe('INVALID_CREDENTIALS'));
    await request(app).get('/auth/providers').expect(200)
      .expect(({ body }) => expect(body.data).toEqual({ google: false }));
    await request(app).get('/auth/google/start').expect(503)
      .expect(({ body }) => expect(body.error.code).toBe('GOOGLE_NOT_CONFIGURED'));
  });
});
