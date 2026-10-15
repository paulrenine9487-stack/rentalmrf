import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';

import { initWebVitals } from './utils/webVitals';
import { initSentry } from './services/sentry';
import { initPostHog } from './services/posthog';

// Initialize production observability & performance tracking
initWebVitals();
initSentry();
initPostHog();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

