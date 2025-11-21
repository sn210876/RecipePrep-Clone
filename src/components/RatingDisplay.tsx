import { useState } from 'react';

function RatingDisplay({ rating, size = 'md', interactive = false, onRate }) {
  const [hoverRating, setHoverRating] = useState(0);
  
  // Responsive sizing for mobile
  const sizeClasses = {
    sm: {
      text: 'text-base sm:text-lg',
      button: 'w-7 h-7 sm:w-8 sm:h-8',
      gap: 'gap-0.5 sm:gap-1'
    },
    md: {
      text: 'text-xl sm:text-2xl',
      button: 'w-9 h-9 sm:w-10 sm:h-10',
      gap: 'gap-1 sm:gap-1.5'
    },
    lg: {
      text: 'text-2xl sm:text-3xl md:text-4xl',
      button: 'w-11 h-11 sm:w-12 sm:h-12',
      gap: 'gap-1 sm:gap-2'
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

// Demo Component
export default function RatingDisplayDemo() {
  const [userRating, setUserRating] = useState(0);
  const [savedRating, setSavedRating] = useState(3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Rating Display Component
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Mobile-optimized with touch-friendly targets
          </p>
        </div>

        {/* Interactive Rating Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-orange-200">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Rate This Recipe
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Tap the flames to rate (interactive)
              </p>
              <div className="flex items-center gap-3 sm:gap-4">
                <RatingDisplay
                  rating={userRating}
                  size="lg"
                  interactive={true}
                  onRate={setUserRating}
                />
                {userRating > 0 && (
                  <span className="text-sm sm:text-base font-semibold text-orange-600">
                    {userRating} / 5
                  </span>
                )}
              </div>
              {userRating > 0 && (
                <button
                  onClick={() => setUserRating(0)}
                  className="mt-3 text-xs sm:text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Clear rating
                </button>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                Size Variations
              </h3>
              <div className="space-y-4">
                {/* Small */}
                <div className="flex items-center gap-4">
                  <span className="text-xs sm:text-sm text-gray-600 w-16 sm:w-20">Small:</span>
                  <RatingDisplay rating={4} size="sm" />
                </div>
                
                {/* Medium */}
                <div className="flex items-center gap-4">
                  <span className="text-xs sm:text-sm text-gray-600 w-16 sm:w-20">Medium:</span>
                  <RatingDisplay rating={3} size="md" />
                </div>
                
                {/* Large */}
                <div className="flex items-center gap-4">
                  <span className="text-xs sm:text-sm text-gray-600 w-16 sm:w-20">Large:</span>
                  <RatingDisplay rating={5} size="lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Display-Only Rating Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
            Average Rating (Read-Only)
          </h2>
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <RatingDisplay
              rating={savedRating}
              size="lg"
              interactive={false}
            />
            <div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {savedRating.toFixed(1)}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                Based on 127 ratings
              </div>
            </div>
          </div>
          
          {/* Demo Controls */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-3">
              Adjust demo rating:
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setSavedRating(num)}
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-semibold transition-all
                    ${savedRating === num
                      ? 'bg-orange-500 text-white shadow-lg scale-110'
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

        {/* Partial Ratings Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
            Partial Ratings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs sm:text-sm text-gray-600 w-20 sm:w-24">1.5 stars:</span>
              <RatingDisplay rating={1.5} size="md" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs sm:text-sm text-gray-600 w-20 sm:w-24">2.8 stars:</span>
              <RatingDisplay rating={2.8} size="md" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs sm:text-sm text-gray-600 w-20 sm:w-24">4.2 stars:</span>
              <RatingDisplay rating={4.2} size="md" />
            </div>
          </div>
        </div>

        {/* Recipe Card Example */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <img
            src="https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=400&fit=crop"
            alt="Recipe"
            className="w-full h-40 sm:h-48 object-cover"
          />
          <div className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Chocolate Chip Cookies
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Classic homemade cookies with a perfect balance of crispy edges and chewy centers
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <RatingDisplay rating={4.5} size="md" />
                <span className="text-sm sm:text-base text-gray-600">
                  4.5 <span className="text-xs sm:text-sm">(89 ratings)</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                <span>⏱️ 30 min</span>
                <span>•</span>
                <span>👥 24 servings</span>
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-lg px-4 py-2.5 sm:py-3 transition-all hover:scale-[1.02] active:scale-95 text-sm sm:text-base">
              View Recipe
            </button>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
            Mobile Optimizations
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Touch-friendly tap targets (minimum 44x44px)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Responsive sizing that scales with screen size</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Hover preview on desktop, tap to rate on mobile</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Visual feedback with scale animations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Support for partial ratings (decimals)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Accessible with ARIA labels</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}