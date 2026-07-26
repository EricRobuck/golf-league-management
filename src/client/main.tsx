import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CurrentPlayerProvider } from './context/CurrentPlayerContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CurrentPlayerProvider>
        <App />
      </CurrentPlayerProvider>
    </BrowserRouter>
  </React.StrictMode>
);
