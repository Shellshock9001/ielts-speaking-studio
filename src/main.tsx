import React from 'react';
import { createRoot } from 'react-dom/client';
import WorldAcademy from './world/WorldAcademy';

const mount = document.getElementById('root');
if (!mount) throw new Error('SpeakLab root is missing.');
createRoot(mount).render(<React.StrictMode><WorldAcademy /></React.StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', {scope:import.meta.env.BASE_URL}).catch(() => {
      // Offline access is optional. Learning still works if the browser disallows service workers.
    });
  });
}
