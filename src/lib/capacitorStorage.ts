import { Preferences } from '@capacitor/preferences';
import { SupportedStorage } from '@supabase/supabase-js';

export class CapacitorStorage implements SupportedStorage {
  private cache = new Map<string, string>();
  private useLocalStorageFallback = false;

  private async testPreferences(): Promise<boolean> {
    try {
      const testKey = '__preferences_test__';
      await Preferences.set({ key: testKey, value: 'test' });
      await Preferences.remove({ key: testKey });
      return true;
    } catch (error) {
      console.warn('⚠️ [CapacitorStorage] Preferences plugin not available, using localStorage fallback');
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.cache.has(key)) {
        console.log('📦 [CapacitorStorage] Cache hit for key:', key);
        return this.cache.get(key) || null;
      }

      if (this.useLocalStorageFallback) {
        console.log('📦 [CapacitorStorage] Reading from localStorage fallback:', key);
        const value = localStorage.getItem(key);
        if (value) {
          this.cache.set(key, value);
          console.log('✅ [CapacitorStorage] Retrieved from localStorage:', key, 'length:', value.length);
        }
        return value;
      }

      console.log('📦 [CapacitorStorage] Reading from storage:', key);
      const { value } = await Preferences.get({ key });

      if (value) {
        this.cache.set(key, value);
        console.log('✅ [CapacitorStorage] Retrieved value for key:', key, 'length:', value.length);
      } else {
        console.log('ℹ️ [CapacitorStorage] No value found for key:', key);
      }

      return value;
    } catch (error: any) {
      console.error('❌ [CapacitorStorage] Error reading key:', key, error);

      if (!this.useLocalStorageFallback && error.message?.includes('not implemented')) {
        console.warn('⚠️ [CapacitorStorage] Switching to localStorage fallback');
        this.useLocalStorageFallback = true;
        return this.getItem(key);
      }

      console.log('📦 [CapacitorStorage] Attempting localStorage fallback for key:', key);
      try {
        return localStorage.getItem(key);
      } catch (fallbackError) {
        console.error('❌ [CapacitorStorage] localStorage fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.useLocalStorageFallback) {
        console.log('📝 [CapacitorStorage] Writing to localStorage fallback:', key, 'length:', value.length);
        localStorage.setItem(key, value);
        this.cache.set(key, value);
        console.log('✅ [CapacitorStorage] Successfully stored to localStorage:', key);
        return;
      }

      console.log('📝 [CapacitorStorage] Writing to storage:', key, 'length:', value.length);
      await Preferences.set({ key, value });
      this.cache.set(key, value);
      console.log('✅ [CapacitorStorage] Successfully stored key:', key);
    } catch (error: any) {
      console.error('❌ [CapacitorStorage] Error storing key:', key, error);

      if (!this.useLocalStorageFallback && error.message?.includes('not implemented')) {
        console.warn('⚠️ [CapacitorStorage] Switching to localStorage fallback');
        this.useLocalStorageFallback = true;
        return this.setItem(key, value);
      }

      console.log('📝 [CapacitorStorage] Attempting localStorage fallback for key:', key);
      try {
        localStorage.setItem(key, value);
        this.cache.set(key, value);
        console.log('✅ [CapacitorStorage] Successfully stored to localStorage:', key);
      } catch (fallbackError) {
        console.error('❌ [CapacitorStorage] localStorage fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.useLocalStorageFallback) {
        console.log('🗑️ [CapacitorStorage] Removing from localStorage fallback:', key);
        localStorage.removeItem(key);
        this.cache.delete(key);
        console.log('✅ [CapacitorStorage] Successfully removed from localStorage:', key);
        return;
      }

      console.log('🗑️ [CapacitorStorage] Removing from storage:', key);
      await Preferences.remove({ key });
      this.cache.delete(key);
      console.log('✅ [CapacitorStorage] Successfully removed key:', key);
    } catch (error: any) {
      console.error('❌ [CapacitorStorage] Error removing key:', key, error);

      if (!this.useLocalStorageFallback && error.message?.includes('not implemented')) {
        console.warn('⚠️ [CapacitorStorage] Switching to localStorage fallback');
        this.useLocalStorageFallback = true;
        return this.removeItem(key);
      }

      console.log('🗑️ [CapacitorStorage] Attempting localStorage fallback for key:', key);
      try {
        localStorage.removeItem(key);
        this.cache.delete(key);
        console.log('✅ [CapacitorStorage] Successfully removed from localStorage:', key);
      } catch (fallbackError) {
        console.error('❌ [CapacitorStorage] localStorage fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  clearCache(): void {
    console.log('🧹 [CapacitorStorage] Clearing cache');
    this.cache.clear();
  }
}
