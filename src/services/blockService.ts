import { supabase } from '../lib/supabase';

export const blockService = {
  async getBlockedUserIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', userId);

      if (error) throw error;

      return data?.map(b => b.blocked_id) || [];
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  },

  async getUsersWhoBlockedMe(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocked_id', userId);

      if (error) throw error;

      return data?.map(b => b.blocker_id) || [];
    } catch (error) {
      console.error('Error fetching users who blocked me:', error);
      return [];
    }
  },

  async isUserBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', targetUserId)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  },

  async amIBlockedBy(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', targetUserId)
        .eq('blocked_id', currentUserId)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      console.error('Error checking if blocked by user:', error);
      return false;
    }
  },

  filterBlockedUsers<T extends { user_id?: string; id?: string }>(
    items: T[],
    blockedUserIds: string[],
    usersWhoBlockedMe: string[]
  ): T[] {
    return items.filter(item => {
      const userId = item.user_id || item.id;
      if (!userId) return true;

      return !blockedUserIds.includes(userId) && !usersWhoBlockedMe.includes(userId);
    });
  }
};
