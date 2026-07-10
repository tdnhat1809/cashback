import { randomBytes, randomUUID } from 'node:crypto';

export const createId = (prefix: string) => `${prefix}_${randomUUID().replaceAll('-', '')}`;
export const createOpaqueToken = (bytes = 24) => randomBytes(bytes).toString('base64url');
export const nowIso = () => new Date().toISOString();
