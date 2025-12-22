import { errorHandler } from './errorHandler';

export interface EnvCheckResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  values: Record<string, string>;
}

const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const OPTIONAL_ENV_VARS = [
  'VITE_OPENAI_API_KEY',
  'VITE_RECIPE_SERVER_URL'
];

export function checkEnvironment(): EnvCheckResult {
  errorHandler.info('EnvChecker', '🔍 Starting environment validation...');

  const missing: string[] = [];
  const warnings: string[] = [];
  const values: Record<string, string> = {};

  REQUIRED_ENV_VARS.forEach(envVar => {
    const value = import.meta.env[envVar];
    if (!value) {
      missing.push(envVar);
      errorHandler.error('EnvChecker', `Missing required environment variable: ${envVar}`);
    } else {
      values[envVar] = value.substring(0, 20) + '...';
      errorHandler.info('EnvChecker', `✅ Found ${envVar}`);
    }
  });

  OPTIONAL_ENV_VARS.forEach(envVar => {
    const value = import.meta.env[envVar];
    if (!value) {
      warnings.push(envVar);
      errorHandler.warning('EnvChecker', `Optional environment variable missing: ${envVar}`);
    } else {
      values[envVar] = value.substring(0, 20) + '...';
      errorHandler.info('EnvChecker', `✅ Found ${envVar}`);
    }
  });

  const isValid = missing.length === 0;

  if (isValid) {
    errorHandler.info('EnvChecker', '✅ All required environment variables present');
  } else {
    errorHandler.error('EnvChecker', '❌ Environment validation failed', { missing, warnings });
  }

  return {
    isValid,
    missing,
    warnings,
    values
  };
}

export function logSystemInfo() {
  errorHandler.info('System', '📱 System Information:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    url: window.location.href,
    timestamp: new Date().toISOString()
  });
}
