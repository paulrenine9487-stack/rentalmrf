const rateLimit = require('express-rate-limit');

/**
 * Standard API Rate Limiter
 * Protects against generic scraping and denial of service
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // Limit each IP to 600 requests per 15-minute window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Never rate limit localhost development or health check probes
    const ip = req.ip || req.connection?.remoteAddress || '';
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || process.env.NODE_ENV !== 'production';
    return isLocal || req.path === '/api/health' || req.path === '/health';
  },
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

/**
 * Strict Authentication Rate Limiter
 * Protects login, password reset, and OTP generation from brute-force & credential stuffing attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. For security reasons, please wait 15 minutes before trying again.'
  }
});

/**
 * Have I Been Pwned / Password Check Limiter
 */
const hibpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 queries per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded for password breach verification. Please wait a moment.'
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  hibpLimiter
};
