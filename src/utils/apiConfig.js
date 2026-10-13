/**
 * Centralized API Base URL Configuration for MCC MRF Innovation Park Portal
 * Dynamically resolves backend API whether accessed via:
 * 1. Localhost (desktop development)
 * 2. Local Network IP (testing on mobile phones / tablets via Wi-Fi)
 * 3. Live Production URL (cloud deployment e.g. Render, Railway, VPS, domain)
 */

export const getApiBaseUrl = () => {
  // 1. Explicit Vite environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // 2. Client-side dynamic resolution
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;

    // If served on production (e.g. standard port 80/443 or unified server on 5000)
    if (port === '5000' || port === '80' || port === '443' || port === '') {
      return '';
    }

    // If on Vite dev server (port 5173 / other)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    // If accessing via LAN IP (e.g. 10.100.7.82 or 192.168.x.x from mobile phone)
    return `${protocol}//${hostname}:5000`;
  }

  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export default API_BASE_URL;
