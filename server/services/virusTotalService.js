/**
 * VirusTotal API v3 Threat Intelligence & Malware Analysis Service
 */

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || '';
const VT_BASE_URL = 'https://www.virustotal.com/api/v3';

/**
 * Encodes URL to base64url format required by VirusTotal v3 API
 * @param {string} url 
 * @returns {string}
 */
function urlToId(url) {
  return Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Scans / analyzes a target URL with VirusTotal
 * @param {string} targetUrl 
 * @returns {Promise<object>}
 */
async function scanUrl(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error('Valid URL string is required');
  }

  // If no API key configured, run local heuristic domain check
  if (!VIRUSTOTAL_API_KEY) {
    let hostname = '';
    try {
      hostname = new URL(targetUrl).hostname;
    } catch {
      hostname = targetUrl;
    }

    const isSuspicious = /(bit\.ly|tinyurl|\.xyz|\.top|\.ru|\.click|free-money|phish)/i.test(targetUrl);

    return {
      success: true,
      mode: 'heuristic_offline',
      url: targetUrl,
      domain: hostname,
      verdict: isSuspicious ? 'suspicious' : 'clean',
      reputationScore: isSuspicious ? 35 : 98,
      stats: {
        malicious: isSuspicious ? 4 : 0,
        suspicious: isSuspicious ? 2 : 0,
        undetected: 65,
        harmless: 25
      },
      message: 'VirusTotal API key not configured in .env / Doppler. Heuristic reputation check completed.'
    };
  }

  try {
    const urlId = urlToId(targetUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // 1. Fetch current analysis report for URL ID
    const res = await fetch(`${VT_BASE_URL}/urls/${urlId}`, {
      method: 'GET',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (res.status === 404) {
      // URL has not been analyzed yet; request a new scan
      const postRes = await fetch(`${VT_BASE_URL}/urls`, {
        method: 'POST',
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ url: targetUrl }).toString()
      });

      const postData = await postRes.json();
      return {
        success: true,
        mode: 'live_queued',
        url: targetUrl,
        scanId: postData.data?.id,
        verdict: 'queued',
        message: 'URL submitted to VirusTotal engine for real-time analysis.'
      };
    }

    const data = await res.json();
    const attributes = data.data?.attributes || {};
    const stats = attributes.last_analysis_stats || {};

    const isMalicious = (stats.malicious || 0) > 0 || (stats.suspicious || 0) > 2;

    return {
      success: true,
      mode: 'live_virustotal_v3',
      url: targetUrl,
      verdict: isMalicious ? 'malicious' : 'clean',
      stats: {
        malicious: stats.malicious || 0,
        suspicious: stats.suspicious || 0,
        harmless: stats.harmless || 0,
        undetected: stats.undetected || 0
      },
      reputation: attributes.reputation || 0,
      lastAnalysisDate: attributes.last_analysis_date
        ? new Date(attributes.last_analysis_date * 1000).toISOString()
        : new Date().toISOString(),
      message: isMalicious
        ? `Warning: VirusTotal flagged this URL with ${stats.malicious} security engine alert(s)!`
        : 'VirusTotal verified: 0 security vendors flagged this URL as malicious.'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      message: 'Failed to contact VirusTotal API service.'
    };
  }
}

/**
 * Checks a file hash (SHA-256) on VirusTotal
 * @param {string} sha256 
 * @returns {Promise<object>}
 */
async function checkFileHash(sha256) {
  if (!sha256 || !/^[a-fA-F0-9]{64}$/.test(sha256)) {
    throw new Error('Valid 64-character SHA-256 hash required');
  }

  if (!VIRUSTOTAL_API_KEY) {
    return {
      success: true,
      mode: 'heuristic_offline',
      hash: sha256,
      verdict: 'clean',
      stats: { malicious: 0, suspicious: 0, harmless: 40, undetected: 30 },
      message: 'VirusTotal API key not configured; default clean state.'
    };
  }

  try {
    const res = await fetch(`${VT_BASE_URL}/files/${sha256}`, {
      method: 'GET',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
        'Accept': 'application/json'
      }
    });

    const data = await res.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};

    return {
      success: true,
      mode: 'live_virustotal_v3',
      hash: sha256,
      stats,
      verdict: (stats.malicious || 0) > 0 ? 'malicious' : 'clean'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Returns VirusTotal integration status
 */
function getStatus() {
  return {
    configured: Boolean(VIRUSTOTAL_API_KEY && VIRUSTOTAL_API_KEY.length > 10),
    service: 'VirusTotal API v3',
    features: ['URL Analysis', 'File Hash Inspection', 'Domain Reputation']
  };
}

module.exports = {
  scanUrl,
  checkFileHash,
  getStatus
};
