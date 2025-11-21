import { useState } from 'react';

function RatingDisplay({ rating, size = 'md', interactive = false, onRate }) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: {
      text: 'text-base',
      button: 'w-8 h-8',
      gap: 'gap-1'
    },
    md: {
      text: 'text-xl',
      button: 'w-10 h-10',
      gap: 'gap-1.5'
    },
    lg: {
      text: 'text-2xl',
      button: 'w-12 h-12',
      gap: 'gap-2'
    }
  }[size];

  const handleRate = (fire) => {
    if (interactive && onRate) {
      onRate(fire);
    }
  };

  return (
    <div className={`flex ${sizeClasses.gap}`}>
      {[1, 2, 3, 4, 5].map((fire) => {
        const isActive = fire <= (hoverRating || rating);
        
        return (
          <button
            key={fire}
            onClick={() => handleRate(fire)}
            onMouseEnter={() => interactive && setHoverRating(fire)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
            className={`
              flex items-center justify-center rounded-lg transition-all duration-200
              ${sizeClasses.button}
              ${interactive 
                ? 'cursor-pointer hover:scale-110 active:scale-95 touch-manipulation' 
                : 'cursor-default'
              }
              ${interactive ? 'hover:bg-orange-50' : ''}
              ${sizeClasses.text}
            `}
            aria-label={`Rate ${fire} out of 5`}
          >
            <span 
              className={`transition-all duration-200 ${
                isActive 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-20 grayscale scale-90'
              }`}
            >
              🔥
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [defaultRating, setDefaultRating] = useState(3);
  const [displaySize, setDisplaySize] = useState('md');

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 mb-1">{label}</div>
        <div className="text-sm text-gray-600 leading-relaxed">{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`
          relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ease-in-out
          ${enabled ? 'bg-orange-500' : 'bg-gray-300'}
        `}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md
            transition-transform duration-200 ease-in-out
            ${enabled ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="px-4 py-4 pb-20">
        <div className="max-w-2xl mx-auto space-y-4">
          
          {/* Account Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">Account</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👤</span>
                  <span className="font-medium text-gray-900">Profile Settings</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔐</span>
                  <span className="font-medium text-gray-900">Privacy & Security</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💳</span>
                  <span className="font-medium text-gray-900">Billing</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">Preferences</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="px-4">
                <ToggleSwitch
                  enabled={notifications}
                  onChange={setNotifications}
                  label="Push Notifications"
                  description="Get notified about new ratings and updates"
                />
              </div>
              <div className="px-4">
                <ToggleSwitch
                  enabled={darkMode}
                  onChange={setDarkMode}
                  label="Dark Mode"
                  description="Switch to dark theme for better viewing at night"
                />
              </div>
              <div className="px-4">
                <ToggleSwitch
                  enabled={autoplay}
                  onChange={setAutoplay}
                  label="Autoplay Videos"
                  description="Automatically play videos when scrolling"
                />
              </div>
            </div>
          </div>

          {/* Rating Display Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">Rating Display</h2>
            </div>
            <div className="p-4 space-y-6">
              {/* Display Size */}
              <div>
                <label className="block font-semibold text-gray-900 mb-3">
                  Display Size
                </label>
                <div className="flex gap-2">
                  {['sm', 'md', 'lg'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setDisplaySize(size)}
                      className={`
                        flex-1 py-3 rounded-lg font-semibold transition-all text-sm
                        ${displaySize === size
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block font-semibold text-gray-900 mb-3">
                  Preview
                </label>
                <div className="flex items-center justify-center py-6 bg-gray-50 rounded-lg">
                  <RatingDisplay rating={defaultRating} size={displaySize} />
                </div>
              </div>

              {/* Default Rating */}
              <div>
                <label className="block font-semibold text-gray-900 mb-3">
                  Default Rating Value
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setDefaultRating(num)}
                      className={`
                        flex-1 h-12 rounded-lg font-semibold transition-all
                        ${defaultRating === num
                          ? 'bg-orange-500 text-white shadow-md scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">About</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-900">Version</span>
                <span className="text-gray-600">1.0.0</span>
              </button>
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-900">Terms of Service</span>
                <span className="text-gray-400">›</span>
              </button>
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-900">Privacy Policy</span>
                <span className="text-gray-400">›</span>
              </button>
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-900">Help & Support</span>
                <span className="text-gray-400">›</span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-200">
              <h2 className="font-bold text-red-900">Danger Zone</h2>
            </div>
            <div className="p-4">
              <button className="w-full py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold rounded-lg transition-colors">
                Sign Out
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Safe Area Spacer */}
      <div className="h-8" />
    </div>
  );
}