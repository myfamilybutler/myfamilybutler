import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Retrieve the encryption key from the environment.
 * NEVER fall back to a hardcoded or database credential key.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for encrypting sensitive data such as Gemini API keys.'
    );
  }
  if (secret.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a string using AES-256-GCM with an auth tag.
 * Returns a string in the format: iv:authTag:ciphertext (all hex).
 * Throws if encryption fails or no key is configured.
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with AES-256-GCM.
 * Expected format: iv:authTag:ciphertext (all hex).
 * Throws if the value is malformed, the key is missing, or decryption fails.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');

  // New format: iv:authTag:ciphertext
  if (parts.length === 3 && parts[0].length === IV_LENGTH * 2 && parts[1].length === AUTH_TAG_LENGTH * 2) {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Legacy CBC format: iv:ciphertext (no auth tag). Only supported while migrating old data.
  if (parts.length === 2 && parts[0].length === IV_LENGTH * 2) {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // If the text does not match either encrypted format, assume it is unencrypted legacy data.
  // This is a safety fallback for rows stored before encryption was introduced.
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }

  throw new Error('Invalid encrypted value format.');
}
