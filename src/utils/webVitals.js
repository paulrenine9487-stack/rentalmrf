import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { API_BASE_URL } from './apiConfig';

const VITALS_STORAGE_KEY = 'mccmrf_crux_web_vitals';

/**
 * Dispatches metric to backend and caches locally
 */
function sendToAnalytics(metric) {
  const payload = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    path: window.location.pathname
  };

  // 1. Update localStorage cache for live in-app meters
  try {
    const existing = JSON.parse(localStorage.getItem(VITALS_STORAGE_KEY) || '{}');
    existing[metric.name] = {
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(VITALS_STORAGE_KEY, JSON.stringify(existing));
  } catch {}

  // 2. Transmit beacon to backend API
  const endpoint = `${API_BASE_URL}/api/analytics/web-vitals`;
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
  } else {
    fetch(endpoint, {
      body,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(() => {});
  }
}

/**
 * Initializes Core Web Vitals Tracking (LCP, INP, CLS, FCP, TTFB)
 */
export function initWebVitals() {
  try {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  } catch (err) {
    console.warn('[Web Vitals] Failed to initialize Core Web Vitals observers:', err);
  }
}

/**
 * Returns latest cached Core Web Vitals metrics from browser
 */
export function getLocalWebVitals() {
  try {
    return JSON.parse(localStorage.getItem(VITALS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}
