import { Preferences } from '@capacitor/preferences';
import { SupportedStorage } from '@supabase/supabase-js';

export class CapacitorStorage implements SupportedStorage {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
