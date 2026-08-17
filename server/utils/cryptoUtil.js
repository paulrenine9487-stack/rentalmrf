const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY_RAW = process.env.SMTP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'mccmrfip_smtp_aes256_encryption_key_2026';
// Derive a 32-byte key using scrypt
const KEY = crypto.scryptSync(SECRET_KEY_RAW, 'mccmrfip_smtp_salt_2026', 32);

/**
 * Encrypt SMTP Password at rest using AES-256-GCM
 * @param {string} text - Plaintext password
 * @returns {string} - JSON string containing iv, content, and auth tag
 */
function encryptSmtpPassword(text) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return JSON.stringify({
      iv: iv.toString('hex'),
      content: encrypted,
      tag: authTag
    });
  } catch (err) {
    console.error('[CRYPTO ERROR] Failed to encrypt SMTP password:', err.message);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt SMTP Password from database
 * @param {string} encryptedData - JSON string containing iv, content, and auth tag
 * @returns {string} - Plaintext password
 */
function decryptSmtpPassword(encryptedData) {
  if (!encryptedData) return '';
  try {
    let parsed;
    if (typeof encryptedData === 'string') {
      try {
        parsed = JSON.parse(encryptedData);
      } catch (e) {
        // Return raw if unencrypted string
        return encryptedData;
      }
    } else {
      parsed = encryptedData;
    }

    if (!parsed || !parsed.iv || !parsed.content || !parsed.tag) {
      return typeof encryptedData === 'string' ? encryptedData : '';
    }

    const iv = Buffer.from(parsed.iv, 'hex');
    const authTag = Buffer.from(parsed.tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(parsed.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[CRYPTO ERROR] Failed to decrypt SMTP password:', err.message);
    return '';
  }
}

module.exports = {
  encryptSmtpPassword,
  decryptSmtpPassword
};
