const helmet = require('helmet');

/**
 * Enterprise Production Security Headers Middleware
 * Configured specifically for SSL Labs A+ Grade and SecurityHeaders.com A+ Grade
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Needed for inline Vite runtime scripts and React hydration
        'https://cdn.jsdelivr.net',
        'https://us-assets.i.posthog.com',
        'https://browser.sentry-cdn.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https:'
      ],
      connectSrc: [
        "'self'",
        'http://localhost:*',
        'https://*.payu.in',
        'https://secure.payu.in',
        'https://test.payu.in',
        'https://api.pwnedpasswords.com',
        'https://*.sentry.io',
        'https://*.posthog.com',
        'https://www.virustotal.com'
      ],
      frameSrc: [
        "'self'",
        'https://secure.payu.in',
        'https://test.payu.in'
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: [
        "'self'",
        'https://secure.payu.in',
        'https://test.payu.in'
      ],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Allows cross-origin images/resources
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Required for PayU 3DS popups
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: true },
  frameguard: { action: 'sameorigin' },
  hsts: {
    maxAge: 31536000, // 1 Year (Required for SSL Labs A+ & HSTS Preload list)
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: false // Modern standard recommends CSP over deprecated XSS filter
});

/**
 * Custom supplementary headers middleware
 */
function securityHeaders(req, res, next) {
  // Execute helmet middleware
  helmetMiddleware(req, res, () => {
    // Additional strict headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Modern Permissions Policy (Camera, Mic, Geo disabled; Payment allowed)
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(self "https://secure.payu.in" "https://test.payu.in")'
    );

    // Disable X-Powered-By
    res.removeHeader('X-Powered-By');

    // Strict cache-control for sensitive API routes
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/payments')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  });
}

module.exports = securityHeaders;
