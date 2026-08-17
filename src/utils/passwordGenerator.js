/**
 * Cryptographically secure browser password generator.
 * Uses window.crypto.getRandomValues() for strong client-side randomness.
 * Generated password contains uppercase letters, lowercase letters, numbers, and special characters.
 * Example: Mrf@2026#X7pL
 * 
 * @param {number} [length=12] Length of generated password
 * @returns {string} Generated temporary password
 */
export function generateTemporaryPassword(length = 12) {
  const reqLen = Math.max(length, 10);

  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*#';

  const allChars = uppers + lowers + digits + symbols;

  const getRandomChar = (charset) => {
    const array = new Uint8Array(1);
    window.crypto.getRandomValues(array);
    return charset[array[0] % charset.length];
  };

  const passChars = [
    getRandomChar(uppers),
    getRandomChar(lowers),
    getRandomChar(digits),
    getRandomChar(symbols)
  ];

  const fillArray = new Uint8Array(reqLen - passChars.length);
  window.crypto.getRandomValues(fillArray);

  for (let i = 0; i < fillArray.length; i++) {
    passChars.push(allChars[fillArray[i] % allChars.length]);
  }

  // Fisher-Yates Shuffle using crypto random
  for (let i = passChars.length - 1; i > 0; i--) {
    const swapArray = new Uint8Array(1);
    window.crypto.getRandomValues(swapArray);
    const j = swapArray[0] % (i + 1);
    const temp = passChars[i];
    passChars[i] = passChars[j];
    passChars[j] = temp;
  }

  return passChars.join('');
}

/**
 * Evaluates password strength and requirements checklist:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param {string} password 
 * @returns {{
 *   score: number,
 *   label: 'Weak' | 'Medium' | 'Strong',
 *   color: string,
 *   percentage: number,
 *   requirements: {
 *     hasMinLength: boolean,
 *     hasUpper: boolean,
 *     hasLower: boolean,
 *     hasNumber: boolean,
 *     hasSpecial: boolean
 *   },
 *   isValid: boolean
 * }}
 */
export function evaluatePasswordStrength(password = '') {
  const requirements = {
    hasMinLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const passedCount = Object.values(requirements).filter(Boolean).length;
  const isValid = passedCount === 5;

  let label = 'Weak';
  let color = '#DC2626'; // Red
  let percentage = 20;

  if (passedCount >= 5) {
    label = 'Strong';
    color = '#16A34A'; // Green
    percentage = 100;
  } else if (passedCount >= 3) {
    label = 'Medium';
    color = '#EAB308'; // Yellow/Gold
    percentage = 60;
  } else if (passedCount >= 1) {
    label = 'Weak';
    color = '#DC2626';
    percentage = 35;
  } else {
    label = 'Weak';
    color = '#94A3B8';
    percentage = 10;
  }

  return {
    score: passedCount,
    label,
    color,
    percentage,
    requirements,
    isValid
  };
}
