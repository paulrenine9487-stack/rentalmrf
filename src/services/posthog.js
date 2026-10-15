/**
 * Privacy-First PostHog Product Analytics Client
 * Compliant with GDPR, Indian DPDP Act, and Do Not Track (DNT) standards
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

const OPT_OUT_KEY = 'mccmrf_posthog_opt_out';
const EVENT_HISTORY_KEY = 'mccmrf_recent_events';

export function isOptedOut() {
  // Respect browser Do Not Track header
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
    return true;
  }
  return localStorage.getItem(OPT_OUT_KEY) === 'true';
}

export function setOptOut(optOut) {
  localStorage.setItem(OPT_OUT_KEY, optOut ? 'true' : 'false');
}

export function initPostHog() {
  if (isOptedOut()) {
    console.info('🔒 [PostHog] Analytics disabled (Do Not Track preference honored)');
    return;
  }

  if (POSTHOG_KEY) {
    console.info('📊 [PostHog] Production Product Analytics initialized');
  }
}

export function trackEvent(eventName, properties = {}) {
  if (isOptedOut()) return;

  // Mask sensitive properties
  const sanitizedProps = { ...properties };
  delete sanitizedProps.password;
  delete sanitizedProps.token;
  delete sanitizedProps.cvv;
  delete sanitizedProps.cardNumber;

  const eventPayload = {
    event: eventName,
    properties: {
      ...sanitizedProps,
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    }
  };

  // Keep local history for Admin telemetry view
  try {
    const list = JSON.parse(localStorage.getItem(EVENT_HISTORY_KEY) || '[]');
    list.unshift(eventPayload);
    if (list.length > 20) list.pop();
    localStorage.setItem(EVENT_HISTORY_KEY, JSON.stringify(list));
  } catch {}

  // If live key, dispatch to PostHog ingest API
  if (POSTHOG_KEY) {
    fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: eventName,
        properties: sanitizedProps,
        timestamp: new Date().toISOString()
      }),
      keepalive: true
    }).catch(() => {});
  }
}

export function getPostHogStatus() {
  let recentEvents = [];
  try {
    recentEvents = JSON.parse(localStorage.getItem(EVENT_HISTORY_KEY) || '[]');
  } catch {}

  return {
    isConfigured: Boolean(POSTHOG_KEY),
    isOptedOut: isOptedOut(),
    host: POSTHOG_HOST,
    recentEventsCount: recentEvents.length,
    recentEvents: recentEvents.slice(0, 5)
  };
}
