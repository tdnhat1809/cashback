import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const OTP_HASH_PREFIX = 'scrypt';

export const createOpaqueToken = (): string => randomBytes(32).toString('base64url');

export const hashSessionToken = (token: string): string => createHash('sha256').update(token, 'utf8').digest('hex');

export const hashOtpCode = (code: string, salt = randomBytes(16).toString('base64url')): string => {
  const digest = scryptSync(code, salt, 32).toString('base64url');
  return `${OTP_HASH_PREFIX}$${salt}$${digest}`;
};

export const verifyOtpCodeHash = (code: string, encodedHash: string): boolean => {
  const [prefix, salt, expectedEncoded, extra] = encodedHash.split('$');
  if (prefix !== OTP_HASH_PREFIX || !salt || !expectedEncoded || extra !== undefined) return false;

  const expected = Buffer.from(expectedEncoded, 'base64url');
  const actual = scryptSync(code, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
