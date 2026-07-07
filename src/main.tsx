import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
