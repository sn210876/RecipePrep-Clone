import { errorHandler } from './errorHandler';

class SafeStorage {
  private inMemoryStorage: Map<string, string> = new Map();
  private isLocalStorageAvailable: boolean = false;

  constructor() {
    this.checkLocalStorageAvailability();
  }

  private checkLocalStorageAvailability(): void {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.isLocalStorageAvailable = true;
      errorHandler.info('SafeStorage', 'localStorage is available');
    } catch (error) {
      this.isLocalStorageAvailable = false;
      errorHandler.warning('SafeStorage', 'localStorage not available, using in-memory fallback', error);
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(key);
      }
      return this.inMemoryStorage.get(key) || null;
    } catch (error) {
      errorHandler.error('SafeStorage', `Failed to get item: ${key}`, error);
      return this.inMemoryStorage.get(key) || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(key, value);
      }
      this.inMemoryStorage.set(key, value);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        errorHandler.error('SafeStorage', 'Storage quota exceeded', error);
        this.clearOldItems();
        try {
          if (this.isLocalStorageAvailable) {
            localStorage.setItem(key, value);
          }
          this.inMemoryStorage.set(key, value);
        } catch (retryError) {
          errorHandler.error('SafeStorage', 'Failed to set item after clearing', retryError);
          this.inMemoryStorage.set(key, value);
        }
      } else {
        errorHandler.error('SafeStorage', `Failed to set item: ${key}`, error);
        this.inMemoryStorage.set(key, value);
      }
    }
  }

  removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(key);
      }
      this.inMemoryStorage.delete(key);
    } catch (error) {
      errorHandler.error('SafeStorage', `Failed to remove item: ${key}`, error);
      this.inMemoryStorage.delete(key);
    }
  }

  clear(): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.clear();
      }
      this.inMemoryStorage.clear();
    } catch (error) {
      errorHandler.error('SafeStorage', 'Failed to clear storage', error);
      this.inMemoryStorage.clear();
    }
  }

  private clearOldItems(): void {
    try {
      if (!this.isLocalStorageAvailable) return;

      const keys = Object.keys(localStorage);
      const now = Date.now();

      for (const key of keys) {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const data = JSON.parse(value);
              if (data.timestamp && now - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
                localStorage.removeItem(key);
                errorHandler.info('SafeStorage', `Removed old item: ${key}`);
              }
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      errorHandler.error('SafeStorage', 'Failed to clear old items', error);
    }
  }

  hasItem(key: string): boolean {
    try {
      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(key) !== null;
      }
      return this.inMemoryStorage.has(key);
    } catch (error) {
      errorHandler.error('SafeStorage', `Failed to check item: ${key}`, error);
      return this.inMemoryStorage.has(key);
    }
  }

  getAllKeys(): string[] {
    try {
      if (this.isLocalStorageAvailable) {
        return Object.keys(localStorage);
      }
      return Array.from(this.inMemoryStorage.keys());
    } catch (error) {
      errorHandler.error('SafeStorage', 'Failed to get all keys', error);
      return Array.from(this.inMemoryStorage.keys());
    }
  }
}

export const safeStorage = new SafeStorage();
