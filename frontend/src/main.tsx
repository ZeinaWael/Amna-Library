import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
import i18n from './i18n';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastProvider } from './components/Toast';
import App from './App';
import './index.css';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ToastProvider>
            <QueryClientProvider client={qc}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </QueryClientProvider>
          </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>
    </HelmetProvider>
  </StrictMode>
);
