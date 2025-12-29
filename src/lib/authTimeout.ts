import { errorHandler } from './errorHandler';

export interface TimeoutOptions {
  timeoutMs?: number;
  operationName?: string;
}

export class AuthTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`Authentication operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = 'AuthTimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, operationName = 'Auth operation' } = options;

  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      errorHandler.error('Auth', `⏱️ ${operationName} timed out after ${timeoutMs}ms`);
      reject(new AuthTimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });

  try {
    errorHandler.info('Auth', `⏳ Starting ${operationName} with ${timeoutMs}ms timeout`);
    const result = await Promise.race([promise, timeoutPromise]);
    errorHandler.info('Auth', `✅ ${operationName} completed successfully`);
    return result;
  } catch (error) {
    if (error instanceof AuthTimeoutError) {
      errorHandler.error('Auth', `❌ ${operationName} timed out`, error);
    } else {
      errorHandler.error('Auth', `❌ ${operationName} failed`, error);
    }
    throw error;
  }
}

export async function forceSessionCheck(
  getSession: () => Promise<any>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      errorHandler.info('Auth', `🔄 Force session check attempt ${attempt}/${maxAttempts}`);

      const { data: { session }, error } = await getSession();

      if (session) {
        errorHandler.info('Auth', `✅ Session found on attempt ${attempt}`);
        return session;
      }

      if (error) {
        errorHandler.error('Auth', `❌ Session check error on attempt ${attempt}`, error);
      }

      if (attempt < maxAttempts) {
        errorHandler.info('Auth', `⏳ Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      errorHandler.error('Auth', `❌ Exception during session check attempt ${attempt}`, error);
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  errorHandler.error('Auth', `❌ Failed to find session after ${maxAttempts} attempts`);
  return null;
}
