import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

export const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
export const hmacSha256 = (key: string, value: string) => createHmac('sha256', key).update(value, 'utf8').digest('hex');

const encryptionKey = (secret: string) => createHash('sha256').update(secret, 'utf8').digest();

export const encryptString = (plaintext: string, secret: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
};

export const decryptString = (encoded: string, secret: string) => {
  const payload = Buffer.from(encoded, 'base64url');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

export const maskBankAccount = (accountNumber: string) => `${'*'.repeat(Math.max(4, accountNumber.length - 4))}${accountNumber.slice(-4)}`;
