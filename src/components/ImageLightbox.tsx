import { X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ src, alt, open, onOpenChange }: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-0 overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>

          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[95vh] w-auto h-auto object-contain"
            loading="lazy"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
