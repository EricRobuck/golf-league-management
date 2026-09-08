import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CurrentPlayerProvider } from './context/CurrentPlayerContext';
import { AdminUnlockProvider } from './context/AdminUnlockContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CurrentPlayerProvider>
        <AdminUnlockProvider>
          <App />
        </AdminUnlockProvider>
      </CurrentPlayerProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a nice-to-have; a failed registration shouldn't break the app.
    });
  });
}
