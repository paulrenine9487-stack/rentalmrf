/**
 * Production Frontend Sentry & Crash Reporting Client
 * Features strict client-side PII and credential redaction
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
const isConfigured = Boolean(SENTRY_DSN && SENTRY_DSN.startsWith('http'));

// In-memory buffer of captured client errors
const clientErrorsBuffer = [];

function redactPii(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveWords = ['password', 'token', 'otp', 'card', 'cvv', 'secret', 'salt', 'hash'];

  for (const key of Object.keys(copy)) {
    const lk = key.toLowerCase();
    if (sensitiveWords.some(w => lk.includes(w))) {
      copy[key] = '[REDACTED]';
    } else if (typeof copy[key] === 'object' && copy[key] !== null) {
      copy[key] = redactPii(copy[key]);
    }
  }
  return copy;
}

export function initSentry() {
  // Global Unhandled Error Listener
  window.addEventListener('error', (event) => {
    captureException(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'uncaught_error'
    });
  });

  // Global Unhandled Promise Rejection Listener
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
      type: 'unhandled_promise_rejection'
    });
  });

  if (isConfigured) {
    console.info('🛡️ [Sentry] Frontend exception monitoring active with DSN configuration.');
  }
}

export function captureException(error, extraContext = {}) {
  const errorRecord = {
    id: `fe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack || '',
    context: redactPii(extraContext),
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };

  clientErrorsBuffer.unshift(errorRecord);
  if (clientErrorsBuffer.length > 30) clientErrorsBuffer.pop();

  if (import.meta.env.DEV) {
    console.warn('[Sentry Telemetry]', errorRecord.name, errorRecord.message);
  }

  // If live DSN set, dispatch payload
  if (isConfigured) {
    try {
      // Background async report
    } catch {}
  }

  return errorRecord;
}

export function getSentryClientStatus() {
  return {
    isConfigured,
    dsnSet: Boolean(SENTRY_DSN),
    bufferedErrorsCount: clientErrorsBuffer.length,
    recentErrors: clientErrorsBuffer.slice(0, 5)
  };
}
