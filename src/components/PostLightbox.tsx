import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { useState } from 'react';

interface PostLightboxProps {
  media: Array<{ url: string; type: 'image' | 'video' }>;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostLightbox({ media, initialIndex = 0, open, onOpenChange }: PostLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToNext = () => {
    if (currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentMedia = media[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[9999998] bg-black/95" />
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-0 overflow-hidden z-[9999999]">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-[10] bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            {media.length > 1 && currentIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-[10] bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}

            {media.length > 1 && currentIndex < media.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-[10] bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                onClick={goToNext}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}

            {currentMedia.type === 'video' ? (
              <video
                src={currentMedia.url}
                controls
                className="max-w-full max-h-[95vh] w-auto h-auto"
                autoPlay
              />
            ) : (
              <img
                src={currentMedia.url}
                alt="Post"
                className="max-w-full max-h-[95vh] w-auto h-auto object-contain"
                loading="lazy"
              />
            )}

            {media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
