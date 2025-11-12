import { Button } from './ui/button';
import { UserPlus, UserCheck } from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  title: string;
  caption: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

interface UserProfileViewProps {
  userId: string;
  currentUserId: string | null;
  posts: Post[];
  isFollowing: boolean;
  onBack: () => void;
  onToggleFollow: (userId: string) => void;
}

export function UserProfileView({
  userId,
  currentUserId,
  posts,
  isFollowing,
  onBack,
  onToggleFollow,
}: UserProfileViewProps) {
  const userPosts = posts.filter(p => p.user_id === userId);
  const userProfile = userPosts[0]?.profiles;

  return (
    <div className="p-4">
      <Button
        onClick={onBack}
        variant="outline"
        className="mb-4"
      >
        ← Back to Feed
      </Button>

      <div className="bg-white rounded-xl p-6 mb-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-2xl font-bold">
            {userProfile?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{userProfile?.username || 'User'}</h2>
            <p className="text-gray-600">{userPosts.length} {userPosts.length === 1 ? 'post' : 'posts'}</p>
          </div>
          {userId !== currentUserId && (
            <Button
              onClick={() => onToggleFollow(userId)}
              variant={isFollowing ? 'outline' : 'default'}
              className={isFollowing ? '' : 'bg-orange-500 hover:bg-orange-600'}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Supporting
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Support
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {userPosts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No posts yet
        </div>
      ) : (
        <div className="space-y-4">
          {userPosts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="relative">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title || 'Post'}
                    className="w-full aspect-square object-cover"
                  />
                ) : post.video_url ? (
                  <video
                    src={post.video_url}
                    controls
                    className="w-full aspect-square object-cover"
                  />
                ) : null}
                {post.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                    <h3 className="text-white text-sm font-semibold">{post.title}</h3>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="text-sm text-gray-600">
                  {post._count?.likes || 0} likes • {post._count?.comments || 0} comments
                </div>
                {post.caption && (
                  <p className="text-sm mt-2">{post.caption}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
