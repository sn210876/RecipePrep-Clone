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
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">{author}</p>
          <p className="text-xs text-gray-500">
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        {isOwn && (
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>

      <p className="text-gray-700 text-sm mb-3">{comment}</p>

      {images && images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img.image_url}
              alt={`Review ${idx + 1}`}
              className="rounded-lg object-cover aspect-square"
            />
          ))}
        </div>
      )}
    </div>
  );
}
