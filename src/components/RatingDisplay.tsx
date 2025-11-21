import { useState } from 'react';

interface RatingDisplayProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

/**
 * This component is intentionally empty.
 * We keep it only so imports don't break.
 * It renders NOTHING — no stars, no fires, no text.
 * This completely removes the 5-fire rating row from all recipe cards.
 */
function RatingDisplay({
  rating,
  size = 'md',
  interactive = false,
  onRate,
}: RatingDisplayProps) {
  // We don't need any state or logic anymore
  // Just return null → invisible, takes zero space
  return null;
}

export default RatingDisplay;