import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { i18nReady } from './i18n/config';
import './index.css';
import App from './App.tsx';
import { initMonitoring } from './utils/monitoring';

initMonitoring();

// Render once the visitor's language is loaded, so the first screen is already in their language
void i18nReady.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
