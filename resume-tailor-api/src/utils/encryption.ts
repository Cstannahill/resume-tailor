import crypto from 'crypto';
import { env } from '../config/env.js';

const keyBase64 = env.APP_ENCRYPTION_KEY;
if (!keyBase64) {
  throw new Error('APP_ENCRYPTION_KEY must be defined (base64 encoded 32-byte key)');
}

const key = Buffer.from(keyBase64, 'base64');
if (key.length !== 32) {
  throw new Error('APP_ENCRYPTION_KEY must decode to 32 bytes for AES-256-GCM');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export const encryptSecret = (plaintext: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptSecret = (payload: string): string => {
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = data.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
