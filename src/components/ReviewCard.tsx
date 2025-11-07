import { Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RatingDisplay } from './RatingDisplay';
import { format } from 'date-fns';

interface ReviewImage {
  id: string;
  image_url: string;
}

interface ReviewCardProps {
  id: string;
  rating: number;
  comment: string;
  images: ReviewImage[];
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
    <Card className="p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <RatingDisplay rating={rating} size="sm" />
            <span className="text-xs text-gray-500">{format(new Date(createdAt), 'MMM d, yyyy')}</span>
          </div>
          <p className="text-sm font-medium text-gray-700">{author}</p>
        </div>
        {isOwn && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {comment && (
        <p className="text-sm text-gray-700 leading-relaxed">{comment}</p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          {images.map((image) => (
            <img
              key={image.id}
              src={image.image_url}
              alt="Review"
              className="w-full h-32 object-cover rounded-lg"
            />
          ))}
        </div>
      )}
    </Card>
  );
}
