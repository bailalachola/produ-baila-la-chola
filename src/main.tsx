import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreProvider } from './store';
import { ToastProvider } from './components/Toast';
import { DialogProvider } from './components/Dialog';
import { Acceso } from './components/Acceso';
// Tipografías empaquetadas con la app (funciona sin conexión, sin depender de Google Fonts)
import '@fontsource/anton/latin-400.css';
import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/work-sans/latin-400.css';
import '@fontsource/work-sans/latin-500.css';
import '@fontsource/work-sans/latin-600.css';
import '@fontsource/work-sans/latin-700.css';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Falta #root en index.html');

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <DialogProvider>
        <Acceso>
          <StoreProvider>
            <App />
          </StoreProvider>
        </Acceso>
      </DialogProvider>
    </ToastProvider>
  </StrictMode>,
);
