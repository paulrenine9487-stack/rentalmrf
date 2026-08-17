const crypto = require('crypto');
const db = require('../db');
const { decryptSmtpPassword } = require('../utils/cryptoUtil');

/**
 * Resolves active PayU Merchant Key, Salt, and Environment
 * Checks MySQL active database setting first, falls back to .env
 */
async function getPayUConfig() {
  try {
    const dbSetting = db.getPayUSetting ? await db.getPayUSetting() : null;
    if (dbSetting && dbSetting.merchant_key && dbSetting.merchant_salt) {
      const isProd = (dbSetting.environment || '').toLowerCase() === 'production';
      return {
        merchantKey: dbSetting.merchant_key,
        merchantSalt: dbSetting.merchant_salt,
        environment: isProd ? 'production' : 'test',
        payuUrl: isProd ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment',
        verifyUrl: isProd ? 'https://info.payu.in/merchant/postservice?form=2' : 'https://test.payu.in/merchant/postservice?form=2',
        allowedMethods: dbSetting.allowed_methods || ['UPI', 'CARD']
      };
    }
  } catch (e) {
    console.warn('[PAYU SERVICE] Warning resolving DB PayU config:', e.message);
  }

  const env = (process.env.PAYU_ENVIRONMENT || 'test').toLowerCase();
  const isProd = env === 'production';
  return {
    merchantKey: process.env.PAYU_MERCHANT_KEY || 'gtK2yq',
    merchantSalt: process.env.PAYU_MERCHANT_SALT || 'eCwTwB0s',
    environment: isProd ? 'production' : 'test',
    payuUrl: isProd ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment',
    verifyUrl: isProd ? 'https://info.payu.in/merchant/postservice?form=2' : 'https://test.payu.in/merchant/postservice?form=2',
    allowedMethods: ['UPI', 'CARD']
  };
}

/**
 * Generates SHA-512 Hash for PayU Payment Initiation
 * Sequence: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 */
function generatePayUHash({ key, txnid, amount, productinfo, firstname, email, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '', salt }) {
  const formattedAmount = Number(amount).toFixed(2);
  const hashString = `${key}|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

/**
 * Verifies PayU Response Reverse Hash
 * Sequence: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * With additionalCharges: sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
function verifyPayUResponseHash(resBody, salt) {
  if (!resBody || !resBody.hash) return false;

  const {
    key = '',
    txnid = '',
    amount = '',
    productinfo = '',
    firstname = '',
    email = '',
    udf1 = '',
    udf2 = '',
    udf3 = '',
    udf4 = '',
    udf5 = '',
    status = '',
    additionalCharges = '',
    hash = ''
  } = resBody;

  const formattedAmount = Number(amount).toFixed(2);
  let hashString = '';

  if (additionalCharges) {
    hashString = `${additionalCharges}|${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${formattedAmount}|${txnid}|${key}`;
  } else {
    hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${formattedAmount}|${txnid}|${key}`;
  }

  const computedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  return computedHash.toLowerCase() === hash.toLowerCase();
}

/**
 * Server-to-Server Verification of PayU Transaction via verify_payment API
 * Command: verify_payment
 * Hash: sha512(key|command|var1|salt)
 */
async function verifyPayUTransactionWithApi({ txnid, merchantKey, merchantSalt, verifyUrl }) {
  try {
    const command = 'verify_payment';
    const hashString = `${merchantKey}|${command}|${txnid}|${merchantSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const params = new URLSearchParams();
    params.append('key', merchantKey);
    params.append('command', command);
    params.append('var1', txnid);
    params.append('hash', hash);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    if (data && data.status === 1 && data.transaction_details && data.transaction_details[txnid]) {
      const details = data.transaction_details[txnid];
      return {
        success: details.status === 'success',
        status: details.status,
        payuMoneyId: details.payuMoneyId || details.mihpayid,
        mode: details.mode,
        unmappedstatus: details.unmappedstatus,
        details
      };
    }
    return { success: false, message: data.msg || 'Transaction not found on PayU' };
  } catch (err) {
    console.error('[PAYU SERVICE] API verification error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getPayUConfig,
  generatePayUHash,
  verifyPayUResponseHash,
  verifyPayUTransactionWithApi
};
