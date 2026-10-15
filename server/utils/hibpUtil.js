const crypto = require('crypto');

// In-memory cache for HIBP prefix queries (prefix -> Map<suffix, count>)
const prefixCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Checks a password against the Have I Been Pwned (HIBP) database using k-Anonymity.
 * The full password is NEVER transmitted over the network.
 * 
 * 1. Computes SHA-1 hash of password.
 * 2. Sends only the first 5 characters (prefix) to https://api.pwnedpasswords.com/range/{prefix}.
 * 3. Compares the remaining 35 characters against returned suffixes locally.
 * 
 * @param {string} password - The plaintext password to test
 * @returns {Promise<{ isPwned: boolean, breachCount: number, sha1Prefix: string, checked: boolean, message: string }>}
 */
async function checkPwnedPassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      isPwned: false,
      breachCount: 0,
      sha1Prefix: '',
      checked: false,
      message: 'Invalid password input'
    };
  }

  try {
    // 1. Calculate SHA-1 hash (uppercase hex)
    const sha1Hash = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = sha1Hash.substring(0, 5);
    const suffix = sha1Hash.substring(5);

    // 2. Check cache first
    let suffixMap;
    const cached = prefixCache.get(prefix);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      suffixMap = cached.data;
    } else {
      // 3. Query HIBP API with k-Anonymity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'MCC-MRF-Innovation-Park-Portal-Security/1.0',
          'Add-Padding': 'true' // HIBP padding for response length privacy
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HIBP API responded with HTTP ${response.status}`);
      }

      const bodyText = await response.text();
      suffixMap = new Map();

      // Parse lines: e.g. "00D4F6E7262D4A9BE14EAEAEB74...:12"
      const lines = bodyText.split(/\r?\n/);
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const s = parts[0].trim().toUpperCase();
          const count = parseInt(parts[1].trim(), 10) || 0;
          suffixMap.set(s, count);
        }
      }

      // Cache results
      prefixCache.set(prefix, { data: suffixMap, timestamp: now });
      
      // Cleanup old cache entries if size exceeds 500
      if (prefixCache.size > 500) {
        const oldestKey = prefixCache.keys().next().value;
        prefixCache.delete(oldestKey);
      }
    }

    // 4. Check if our suffix exists in the list
    const count = suffixMap.get(suffix) || 0;
    const isPwned = count > 0;

    return {
      isPwned,
      breachCount: count,
      sha1Prefix: prefix,
      checked: true,
      message: isPwned
        ? `Warning: This password was found in ${count.toLocaleString()} known public data breaches (Have I Been Pwned). We recommend choosing a different password.`
        : 'Good news: This password was not found in any known public data breaches.'
    };
  } catch (error) {
    console.warn('[HIBP] Security check skipped due to network/timeout error:', error.message);
    return {
      isPwned: false,
      breachCount: 0,
      sha1Prefix: '',
      checked: false,
      message: 'HIBP check offline or timed out; proceeded with standard security verification.'
    };
  }
}

/**
 * Validates a 5-character SHA-1 prefix against HIBP (useful when client performs zero-knowledge hashing)
 * @param {string} prefix 5-char hex
 * @returns {Promise<string>} raw suffixes text
 */
async function queryHibpPrefix(prefix) {
  if (!prefix || !/^[A-Fa-f0-9]{5}$/.test(prefix)) {
    throw new Error('Prefix must be exactly 5 hexadecimal characters');
  }

  const cleanPrefix = prefix.toUpperCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${cleanPrefix}`, {
    method: 'GET',
    headers: {
      'User-Agent': 'MCC-MRF-Innovation-Park-Portal-Security/1.0',
      'Add-Padding': 'true'
    },
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`HIBP API responded with HTTP ${response.status}`);
  }

  return await response.text();
}

module.exports = {
  checkPwnedPassword,
  queryHibpPrefix
};
