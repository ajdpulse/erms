import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

// Set default language to Marathi on app initialization
import i18n from './i18n';
if (!localStorage.getItem('i18nextLng')) {
  i18n.changeLanguage('mr');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
