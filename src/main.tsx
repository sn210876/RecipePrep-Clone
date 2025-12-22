import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { errorHandler } from './lib/errorHandler';
import { checkEnvironment, logSystemInfo } from './lib/envChecker';
import './index.css';

errorHandler.info('Main', '🚀 Application starting...');
errorHandler.info('Main', '📅 Build timestamp:', new Date().toISOString());

logSystemInfo();

const envCheck = checkEnvironment();
if (!envCheck.isValid) {
  errorHandler.error('Main', '❌ Environment validation failed!', {
    missing: envCheck.missing,
    warnings: envCheck.warnings
  });
}

window.addEventListener('error', (event) => {
  errorHandler.error('Window', 'Uncaught error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.error('Window', 'Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise
  });
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  errorHandler.error('Main', '❌ Root element not found in DOM');
  throw new Error('Root element not found');
}

errorHandler.info('Main', '✅ Root element found, rendering app...');

try {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
  errorHandler.info('Main', '✅ App rendered successfully');
} catch (error) {
  errorHandler.error('Main', '❌ Failed to render app', error);
  throw error;
}