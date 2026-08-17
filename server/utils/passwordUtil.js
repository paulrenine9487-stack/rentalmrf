const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Cryptographically secure temporary password generator.
 * Uses Node.js crypto.randomBytes to ensure strong randomness.
 * Generated password contains uppercase letters, lowercase letters, numbers, and special characters.
 * Example format: Mrf@2026#X7pL
 * 
 * @param {number} [length=12] Length of generated password (min 10)
 * @returns {string} Plaintext temporary password
 */
function generateTemporaryPassword(length = 12) {
  const reqLen = Math.max(length, 10);

  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars like I, O
  const lowers = 'abcdefghijkmnopqrstuvwxyz'; // Exclude ambiguous l
  const digits = '23456789'; // Exclude ambiguous 0, 1
  const symbols = '!@#$%^&*#';

  const allChars = uppers + lowers + digits + symbols;

  // Ensure at least one character from each set
  const getRandomChar = (charset) => {
    const randomByte = crypto.randomBytes(1)[0];
    return charset[randomByte % charset.length];
  };

  const passChars = [
    getRandomChar(uppers),
    getRandomChar(lowers),
    getRandomChar(digits),
    getRandomChar(symbols)
  ];

  // Fill the rest with random selections from allChars
  const randomBytes = crypto.randomBytes(reqLen - passChars.length);
  for (let i = 0; i < randomBytes.length; i++) {
    passChars.push(allChars[randomBytes[i] % allChars.length]);
  }

  // Cryptographically shuffle array using Fisher-Yates
  for (let i = passChars.length - 1; i > 0; i--) {
    const swapByte = crypto.randomBytes(1)[0];
    const j = swapByte % (i + 1);
    const temp = passChars[i];
    passChars[i] = passChars[j];
    passChars[j] = temp;
  }

  return passChars.join('');
}

/**
 * Validates password strength against security requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param {string} password 
 * @returns {{ valid: boolean, message: string }}
 */
function validatePasswordRequirements(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
  }

  return { valid: true, message: 'Password meets security requirements' };
}

/**
 * Hashes password using bcrypt with standard cost factor
 * @param {string} plainPassword 
 * @returns {string} bcrypt hash
 */
function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, 10);
}

/**
 * Compares plaintext password with bcrypt hash
 * @param {string} plainPassword 
 * @param {string} hash 
 * @returns {boolean}
 */
function comparePassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  return bcrypt.compareSync(plainPassword, hash);
}

module.exports = {
  generateTemporaryPassword,
  validatePasswordRequirements,
  hashPassword,
  comparePassword
};
