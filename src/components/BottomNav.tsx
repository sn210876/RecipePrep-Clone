import { Home, PlusCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-around">
        <button
          onClick={() => onNavigate('feed')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPage === 'feed' ? 'text-orange-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Home className="w-7 h-7" strokeWidth={currentPage === 'feed' ? 2.5 : 2} />
        </button>

        <button
          onClick={() => onNavigate('upload')}
          className="flex flex-col items-center -mt-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-3 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <PlusCircle className="w-8 h-8 text-white" strokeWidth={2} />
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPage === 'profile' ? 'text-orange-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className={`w-8 h-8 rounded-full object-cover ${
                currentPage === 'profile' ? 'ring-2 ring-orange-600' : ''
              }`}
            />
          ) : (
            <User className="w-7 h-7" strokeWidth={currentPage === 'profile' ? 2.5 : 2} />
          )}
        </button>
      </div>
    </nav>
  );
}
