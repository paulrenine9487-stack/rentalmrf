const crypto = require('crypto');

/**
 * Resolves active PayU Merchant Key, Salt, and Environment
 * Strictly prioritizes backend environment variables (.env) over cached database settings.
 * NEVER hardcodes exposed credentials or falls back to old/unauthorized salts.
 */
async function getPayUConfig() {
  const envRaw = (process.env.PAYU_ENVIRONMENT || 'test').toLowerCase().trim();
  const isProd = envRaw === 'production';

  // Read credentials strictly from backend environment variables
  const merchantKey = (process.env.PAYU_MERCHANT_KEY || '').trim();
  const merchantSalt = (process.env.PAYU_MERCHANT_SALT || '').trim();

  // Validate that credentials exist and are not empty or template placeholders
  if (!merchantKey || !merchantSalt || merchantKey === '<MY_CURRENT_TEST_MERCHANT_KEY>' || merchantSalt === '<MY_NEWLY_GENERATED_TEST_MERCHANT_SALT>') {
    const errorMsg = '[PAYU CONFIG ERROR] PayU Merchant Key or Salt is not configured in backend environment variables (.env). Please ensure PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT are set.';
    console.error(errorMsg);
    throw new Error('PayU Payment Gateway credentials are not properly configured on the server. Please check your backend .env file.');
  }

  const payuUrl = isProd ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment';
  const verifyUrl = isProd ? 'https://info.payu.in/merchant/postservice?form=2' : 'https://test.payu.in/merchant/postservice?form=2';

  return {
    merchantKey,
    merchantSalt,
    environment: isProd ? 'production' : 'test',
    payuUrl,
    verifyUrl,
    allowedMethods: ['UPI', 'CARD']
  };
}

/**
 * Generates SHA-512 Hash for PayU Hosted Checkout Initiation
 * Sequence: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 * Exactly 16 pipe delimiters separating 17 segments (udf6 through udf10 are empty in standard Hosted Checkout).
 */
function generatePayUHash({ key, txnid, amount, productinfo, firstname, email, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '', salt }) {
  if (!key || !txnid || amount == null || !salt) {
    throw new Error('Missing mandatory fields for PayU hash generation');
  }

  const cleanKey = String(key).trim();
  const cleanTxnid = String(txnid).trim();
  const amountStr = Number(amount).toFixed(2);
  const cleanProductInfo = String(productinfo || 'MRFRentPayment').replace(/[\r\n\t]/g, ' ').trim();
  const cleanFirstname = String(firstname || 'Customer').replace(/[\r\n\t]/g, ' ').trim();
  const cleanEmail = String(email || 'accounts@mccmrfip.com').replace(/[\r\n\t]/g, ' ').trim();
  const cleanUdf1 = String(udf1 || '').trim();
  const cleanUdf2 = String(udf2 || '').trim();
  const cleanUdf3 = String(udf3 || '').trim();
  const cleanUdf4 = String(udf4 || '').trim();
  const cleanUdf5 = String(udf5 || '').trim();
  const cleanSalt = String(salt).trim();

  const hashString = `${cleanKey}|${cleanTxnid}|${amountStr}|${cleanProductInfo}|${cleanFirstname}|${cleanEmail}|${cleanUdf1}|${cleanUdf2}|${cleanUdf3}|${cleanUdf4}|${cleanUdf5}||||||${cleanSalt}`;
  return crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
}

/**
 * Verifies PayU Response Reverse Hash
 * Standard Sequence: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * With additionalCharges: sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
function verifyPayUResponseHash(resBody, salt) {
  if (!resBody || !resBody.hash || !salt) return false;

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

  const cleanSalt = String(salt).trim();
  const cleanKey = String(key).trim();
  const cleanTxnid = String(txnid).trim();
  const cleanStatus = String(status).trim();
  const cleanProductInfo = String(productinfo || '').trim();
  const cleanFirstname = String(firstname || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanUdf1 = String(udf1 || '').trim();
  const cleanUdf2 = String(udf2 || '').trim();
  const cleanUdf3 = String(udf3 || '').trim();
  const cleanUdf4 = String(udf4 || '').trim();
  const cleanUdf5 = String(udf5 || '').trim();
  const cleanHash = String(hash).trim().toLowerCase();

  const formattedAmount = Number(amount).toFixed(2);
  const rawAmount = String(amount).trim();

  // 1. Try formatted amount first (e.g. 11800.00)
  const hashStringFormatted = additionalCharges
    ? `${additionalCharges}|${cleanSalt}|${cleanStatus}||||||${cleanUdf5}|${cleanUdf4}|${cleanUdf3}|${cleanUdf2}|${cleanUdf1}|${cleanEmail}|${cleanFirstname}|${cleanProductInfo}|${formattedAmount}|${cleanTxnid}|${cleanKey}`
    : `${cleanSalt}|${cleanStatus}||||||${cleanUdf5}|${cleanUdf4}|${cleanUdf3}|${cleanUdf2}|${cleanUdf1}|${cleanEmail}|${cleanFirstname}|${cleanProductInfo}|${formattedAmount}|${cleanTxnid}|${cleanKey}`;

  const computedHashFormatted = crypto.createHash('sha512').update(hashStringFormatted, 'utf8').digest('hex');
  if (computedHashFormatted.toLowerCase() === cleanHash) return true;

  // 2. Try raw amount string (e.g. 11800)
  const hashStringRaw = additionalCharges
    ? `${additionalCharges}|${cleanSalt}|${cleanStatus}||||||${cleanUdf5}|${cleanUdf4}|${cleanUdf3}|${cleanUdf2}|${cleanUdf1}|${cleanEmail}|${cleanFirstname}|${cleanProductInfo}|${rawAmount}|${cleanTxnid}|${cleanKey}`
    : `${cleanSalt}|${cleanStatus}||||||${cleanUdf5}|${cleanUdf4}|${cleanUdf3}|${cleanUdf2}|${cleanUdf1}|${cleanEmail}|${cleanFirstname}|${cleanProductInfo}|${rawAmount}|${cleanTxnid}|${cleanKey}`;

  const computedHashRaw = crypto.createHash('sha512').update(hashStringRaw, 'utf8').digest('hex');
  return computedHashRaw.toLowerCase() === cleanHash;
}

/**
 * Server-to-Server Verification of PayU Transaction via official verify_payment API
 * Command: verify_payment
 * Hash: sha512(key|command|var1|salt)
 */
async function verifyPayUTransactionWithApi({ txnid, merchantKey, merchantSalt, verifyUrl }) {
  try {
    if (!txnid || !merchantKey || !merchantSalt || !verifyUrl) {
      return { success: false, message: 'Missing parameters for server-side verification' };
    }

    const command = 'verify_payment';
    const hashString = `${merchantKey.trim()}|${command}|${txnid.trim()}|${merchantSalt.trim()}`;
    const hash = crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');

    const params = new URLSearchParams();
    params.append('key', merchantKey.trim());
    params.append('command', command);
    params.append('var1', txnid.trim());
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
    return { success: false, message: data.msg || 'Transaction not found on PayU verify_payment API' };
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
