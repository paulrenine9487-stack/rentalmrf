import { API_BASE_URL } from './apiConfig';

/**
 * Zero-Knowledge Client-side Have I Been Pwned (HIBP) Password Checker.
 * Uses the Web Crypto API to hash the password locally via SHA-1.
 * Only the 5-character prefix is sent over the wire.
 * 
 * @param {string} password 
 * @returns {Promise<{ isPwned: boolean, breachCount: number, error?: string }>}
 */
export async function checkPasswordBreach(password) {
  if (!password || typeof password !== 'string') {
    return { isPwned: false, breachCount: 0 };
  }

  try {
    // 1. Compute SHA-1 in browser Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
    
    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1Hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = sha1Hex.substring(0, 5);
    const suffix = sha1Hex.substring(5);

    // 2. Fetch range from backend proxy (or directly if CSP permits)
    let bodyText = '';
    try {
      const res = await fetch(`${API_BASE_URL}/api/security/check-pwned-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix })
      });
      const json = await res.json();
      bodyText = json.suffixes || '';
    } catch {
      // Fallback: Direct query to HIBP API if backend is unreachable
      const directRes = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' }
      });
      bodyText = await directRes.text();
    }

    if (!bodyText) {
      return { isPwned: false, breachCount: 0 };
    }

    // 3. Search for suffix match
    const lines = bodyText.split(/\r?\n/);
    for (const line of lines) {
      const parts = line.split(':');
      if (parts[0] && parts[0].trim().toUpperCase() === suffix) {
        const count = parseInt(parts[1]?.trim() || '0', 10);
        return { isPwned: count > 0, breachCount: count };
      }
    }

    return { isPwned: false, breachCount: 0 };
  } catch (err) {
    console.warn('[HIBP Client] Breach check skipped due to network/crypto issue:', err);
    return { isPwned: false, breachCount: 0, error: err.message };
  }
}
