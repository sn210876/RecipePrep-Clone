import { useState } from 'react';

interface RatingDisplayProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

function RatingDisplay({ rating, size = 'md', interactive = false, onRate }: RatingDisplayProps) {
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

  const handleRate = (fire: number) => {
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
              ${isActive ? 'bg-orange-100' : 'bg-gray-100'}
            `}
            aria-label={`Rate ${fire} out of 5`}
          >
            {isActive && <span className="transition-all duration-200">🔥</span>}
          </button>
        );
      })}
    </div>
  );
}

export default RatingDisplay;