interface RatingDisplayProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function RatingDisplay({ rating, size = 'md', interactive = false, onRate }: RatingDisplayProps) {
  const fontSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((fire) => (
        <button
          key={fire}
          onClick={() => interactive && onRate?.(fire)}
          disabled={!interactive}
          className={`transition-transform ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${fontSize}`}
        >
          <span className={fire <= rating ? 'opacity-100' : 'opacity-30 grayscale'}>
            🔥
          </span>s
        </button>
      ))}
    </div>
  );
}
