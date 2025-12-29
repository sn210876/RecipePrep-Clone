import { Button } from './ui/button';
import { Star, Trash2, Edit } from 'lucide-react';

interface ReviewImage {
  id: string;
  image_url: string;
  review_id: string;
}

interface ReviewCardProps {
  id: string;
  rating: number;
  comment: string;
  images?: ReviewImage[];
  author: string;
  createdAt: string;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ReviewCard({
  rating,
  comment,
  images,
  author,
  createdAt,
  isOwn = false,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
      {/* Header with Author and Actions */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{author}</p>
          <p className="text-xs text-gray-500">
            {new Date(createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>
        {isOwn && (
          <div className="flex gap-1 flex-shrink-0">
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onEdit}
                className="min-h-[36px] min-w-[36px] p-2 hover:bg-gray-100 active:scale-95 transition-all touch-manipulation"
                aria-label="Edit review"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDelete}
                className="min-h-[36px] min-w-[36px] p-2 hover:bg-red-50 active:scale-95 transition-all touch-manipulation"
                aria-label="Delete review"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Star Rating */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 flex-shrink-0 transition-colors ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
            aria-label={star <= rating ? 'Filled star' : 'Empty star'}
          />
        ))}
        <span className="ml-1 text-sm font-semibold text-gray-700">
          {rating}.0
        </span>
      </div>

      {/* Comment */}
      <p className="text-gray-700 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">
        {comment}
      </p>

      {/* Review Images */}
      {images && images.length > 0 && (
        <div className={`grid gap-2 ${
          images.length === 1 ? 'grid-cols-1' : 
          images.length === 2 ? 'grid-cols-2' : 
          'grid-cols-3'
        }`}>
          {images.map((img, idx) => (
            <div
              key={img.id || idx}
              className="relative overflow-hidden rounded-lg bg-gray-100 aspect-square"
            >
             <img
  src={img.image_url}
  alt={`Review image ${idx + 1}`}
  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
  loading="lazy"
  onClick={() => {
    // Optional: Add image viewer/lightbox functionality
    window.open(img.image_url, '_blank');
  }}
/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}