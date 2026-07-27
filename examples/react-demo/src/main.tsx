import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
// Shared stylesheet: same file, same class names, as the Svelte target's components.
import '@thepia/flows-auth/style.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root element not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
