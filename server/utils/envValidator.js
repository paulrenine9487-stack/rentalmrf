/**
 * Environment Variable & Doppler Secrets Validator
 * Ensures all required production variables exist and are cryptographically strong
 */

const REQUIRED_ENV_VARS = [
  'PORT',
  'JWT_SECRET',
  'MYSQL_HOST',
  'MYSQL_DATABASE',
  'MYSQL_USER'
];

const RECOMMENDED_PROD_VARS = [
  'PAYU_MERCHANT_KEY',
  'PAYU_MERCHANT_SALT',
  'SMTP_ENCRYPTION_KEY',
  'SENTRY_DSN',
  'VIRUSTOTAL_API_KEY'
];

const KNOWN_DEFAULT_SECRETS = [
  'mccmrfip_jwt_super_secret_key_2026',
  'mccmrfip_smtp_aes256_encryption_key_2026',
  'secret',
  'changeme',
  '123456'
];

function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  // Check required
  for (const v of REQUIRED_ENV_VARS) {
    if (!process.env[v] || String(process.env[v]).trim() === '') {
      missing.push(v);
    }
  }

  // Check if JWT Secret is weak or default
  const currentJwt = process.env.JWT_SECRET || '';
  if (KNOWN_DEFAULT_SECRETS.includes(currentJwt)) {
    warnings.push({
      key: 'JWT_SECRET',
      severity: isProduction ? 'CRITICAL' : 'WARNING',
      message: 'JWT_SECRET is using a default repository development key. Please configure a unique secret via Doppler.'
    });
  } else if (currentJwt.length < 32 && isProduction) {
    warnings.push({
      key: 'JWT_SECRET',
      severity: 'HIGH',
      message: 'JWT_SECRET is shorter than 32 characters. Recommended 64-character random key.'
    });
  }

  // Check SMTP Encryption Key
  const currentSmtpKey = process.env.SMTP_ENCRYPTION_KEY || '';
  if (KNOWN_DEFAULT_SECRETS.includes(currentSmtpKey)) {
    warnings.push({
      key: 'SMTP_ENCRYPTION_KEY',
      severity: isProduction ? 'HIGH' : 'LOW',
      message: 'SMTP_ENCRYPTION_KEY is using a default key.'
    });
  }

  // Check PayU Keys
  if (process.env.PAYU_MERCHANT_KEY === 'gtKFFx' && isProduction) {
    warnings.push({
      key: 'PAYU_MERCHANT_KEY',
      severity: 'CRITICAL',
      message: 'PayU is currently configured with the test sandbox merchant key (gtKFFx) in production mode.'
    });
  } else if (process.env.PAYU_MERCHANT_KEY === '7kml0E' && !isProduction) {
    warnings.push({
      key: 'PAYU_MERCHANT_KEY',
      severity: 'MEDIUM',
      message: 'Merchant key 7kml0E is configured in test mode. If this is a live key, switch PAYU_ENVIRONMENT to production.'
    });
  }

  const result = {
    isValid: missing.length === 0,
    isProduction,
    missing,
    warnings,
    dopplerActive: Boolean(process.env.DOPPLER_CONFIG || process.env.DOPPLER_ENVIRONMENT),
    checkedAt: new Date().toISOString()
  };

  if (!result.isValid) {
    console.error('❌ [CRITICAL] Missing Required Environment Variables:', missing.join(', '));
  }

  if (warnings.length > 0) {
    console.warn(`⚠️ [SECURITY] ${warnings.length} Environment Security Warning(s) detected.`);
  }

  return result;
}

module.exports = {
  validateEnvironment,
  REQUIRED_ENV_VARS,
  RECOMMENDED_PROD_VARS
};
