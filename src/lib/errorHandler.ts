export interface ErrorLog {
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  context: string;
  message: string;
  details?: unknown;
  stack?: string;
}

class ErrorHandler {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;

  log(type: 'error' | 'warning' | 'info', context: string, message: string, details?: unknown) {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      type,
      context,
      message,
      details,
      stack: details instanceof Error ? details.stack : undefined
    };

    this.logs.push(errorLog);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    const logMethod = type === 'error' ? console.error : type === 'warning' ? console.warn : console.log;

    logMethod(`${emoji} [${context}] ${message}`, details || '');

    if (details instanceof Error && details.stack) {
      console.log('Stack trace:', details.stack);
    }
  }

  error(context: string, message: string, details?: unknown) {
    this.log('error', context, message, details);
  }

  warning(context: string, message: string, details?: unknown) {
    this.log('warning', context, message, details);
  }

  info(context: string, message: string, details?: unknown) {
    this.log('info', context, message, details);
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const errorHandler = new ErrorHandler();

export function withErrorHandling<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context: string
): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorHandler.error(context, 'Async function error', error);
          throw error;
        });
      }
      return result;
    } catch (error) {
      errorHandler.error(context, 'Sync function error', error);
      throw error;
    }
  }) as T;
}

export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    errorHandler.error(context, 'Safe async function error', error);
    return fallback;
  }
}

export function safeSync<T>(
  fn: () => T,
  context: string,
  fallback?: T
): T | undefined {
  try {
    return fn();
  } catch (error) {
    errorHandler.error(context, 'Safe sync function error', error);
    return fallback;
  }
}
