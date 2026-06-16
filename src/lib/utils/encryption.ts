import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * Generate a stable 32-byte key from the environment secret
 */
function getEncryptionKey(): Buffer {
  const secret = 
    process.env.ENCRYPTION_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    'default-fallback-key-for-myfamilybutler-byok-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a string using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Return iv:encrypted
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Failed to encrypt:', error);
    return text;
  }
}

/**
 * Decrypt a string using AES-256-CBC
 * Falls back to returning the text directly if it is not encrypted (backward compatibility)
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    // If it does not contain the colon separator, it might be an unencrypted legacy key
    if (parts.length !== 2 || parts[0].length !== 32) {
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // If decryption fails, return as-is (might be unencrypted)
    return encryptedText;
  }
}
