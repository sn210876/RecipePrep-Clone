import { Preferences } from '@capacitor/preferences';
import { SupportedStorage } from '@supabase/supabase-js';

export class CapacitorStorage implements SupportedStorage {
  private cache = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.cache.has(key)) {
        console.log('📦 [CapacitorStorage] Cache hit for key:', key);
        return this.cache.get(key) || null;
      }

      console.log('📦 [CapacitorStorage] Reading from storage:', key);
      const { value } = await Preferences.get({ key });

      if (value) {
        this.cache.set(key, value);
        console.log('✅ [CapacitorStorage] Retrieved value for key:', key, 'length:', value.length);
      } else {
        console.log('❌ [CapacitorStorage] No value found for key:', key);
      }

      return value;
    } catch (error) {
      console.error('❌ [CapacitorStorage] Error reading key:', key, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      console.log('📝 [CapacitorStorage] Writing to storage:', key, 'length:', value.length);
      await Preferences.set({ key, value });
      this.cache.set(key, value);
      console.log('✅ [CapacitorStorage] Successfully stored key:', key);
    } catch (error) {
      console.error('❌ [CapacitorStorage] Error storing key:', key, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      console.log('🗑️ [CapacitorStorage] Removing from storage:', key);
      await Preferences.remove({ key });
      this.cache.delete(key);
      console.log('✅ [CapacitorStorage] Successfully removed key:', key);
    } catch (error) {
      console.error('❌ [CapacitorStorage] Error removing key:', key, error);
      throw error;
    }
  }

  clearCache(): void {
    console.log('🧹 [CapacitorStorage] Clearing cache');
    this.cache.clear();
  }
}
