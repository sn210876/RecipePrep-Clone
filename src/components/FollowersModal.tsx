import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { PiggyBank } from 'lucide-react';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
}

interface FollowUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export function FollowersModal({ isOpen, onClose, userId, type }: FollowersModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        if (type === 'followers') {
          // Get users who follow this profile
          const { data } = await supabase
            .from('follows')
            .select('follower_id, profiles:follower_id(id, username, avatar_url)')
            .eq('following_id', userId);

          if (data) {
            setUsers(data.map((item: any) => item.profiles).filter(Boolean));
          }
        } else {
          // Get users this profile is following
          const { data } = await supabase
            .from('follows')
            .select('following_id, profiles:following_id(id, username, avatar_url)')
            .eq('follower_id', userId);

          if (data) {
            setUsers(data.map((item: any) => item.profiles).filter(Boolean));
          }
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, userId, type]);

  const handleUserClick = (username: string) => {
    onClose();
    window.location.href = `/profile/${username}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[70vh]">
        <DialogHeader>
          <DialogTitle>
            {type === 'followers' ? 'Supporters' : 'Supporting'}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(70vh-8rem)]">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {type === 'followers' ? 'No supporters yet' : 'Not supporting anyone yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user.username)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.username[0]?.toUpperCase() || <PiggyBank className="w-6 h-6" />
                    )}
                  </div>
                  <span className="font-medium text-gray-900 truncate">
                    {user.username}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}