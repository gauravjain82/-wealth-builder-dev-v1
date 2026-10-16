import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installClientErrorBuffer } from '@/features/helpdesk/support-context/client-error-buffer';

// Initialize Firebase
import '@/infrastructure/firebase';

window.addEventListener('vite:preloadError', (event) => {
  const preloadError = event as Event & { payload?: Error };
  const reloadKey = `wbd:vite-preload-reload:${window.location.pathname}${window.location.search}:${
    preloadError.payload?.message ?? 'unknown'
  }`;

  event.preventDefault();

  if (sessionStorage.getItem(reloadKey)) {
    return;
  }

  sessionStorage.setItem(reloadKey, 'true');
  window.location.reload();
});

// Record recent failed API calls / JS errors for "Report a problem" tickets.
installClientErrorBuffer();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
