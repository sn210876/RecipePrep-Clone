import { useState, useEffect } from 'react';
import { parseVideoUrl, type ParsedVideo } from '@/lib/videoUtils';
import { ExternalLink, Video, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface VideoPlayerProps {
  videoUrl: string;
  className?: string;
}

export function VideoPlayer({ videoUrl, className = '' }: VideoPlayerProps) {
  const [parsedVideo, setParsedVideo] = useState<ParsedVideo | null>(() => {
    console.log('[VideoPlayer] Received URL:', videoUrl);
    const parsed = parseVideoUrl(videoUrl);
    console.log('[VideoPlayer] Parsed result:', parsed);
    return parsed;
  });

  const [embedError, setEmbedError] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);

  useEffect(() => {
    if (parsedVideo?.platform === 'instagram' || parsedVideo?.platform === 'tiktok') {
      const timer = setTimeout(() => {
        setLoadAttempted(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [parsedVideo]);

  if (!parsedVideo) {
    console.log('[VideoPlayer] ❌ Failed to parse video URL, not rendering player');
    return null;
  }

  console.log('[VideoPlayer] ✅ Rendering player for platform:', parsedVideo.platform);

  const getPlatformName = () => {
    switch (parsedVideo.platform) {
      case 'youtube':
        return 'YouTube';
      case 'instagram':
        return 'Instagram';
      case 'tiktok':
        return 'TikTok';
      default:
        return 'Video';
    }
  };

  const getPlatformColor = () => {
    switch (parsedVideo.platform) {
      case 'youtube':
        return 'from-red-500 to-red-600';
      case 'instagram':
        return 'from-pink-500 to-purple-600';
      case 'tiktok':
        return 'from-black to-gray-800';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getAspectRatio = () => {
    if (parsedVideo.platform === 'instagram' || parsedVideo.platform === 'tiktok') {
      return 'aspect-[9/16]';
    }
    return 'aspect-video';
  };

  const getMaxWidth = () => {
    if (parsedVideo.platform === 'instagram' || parsedVideo.platform === 'tiktok') {
      return 'max-w-md';
    }
    return 'max-w-4xl';
  };

  return (
    <div className={`bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-gray-200 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${getPlatformColor()} flex items-center justify-center shadow-md`}>
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Recipe Video
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-600">
              From {getPlatformName()}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(parsedVideo.originalUrl, '_blank')}
          className="gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Open</span>
        </Button>
      </div>

      <div className={`${getMaxWidth()} mx-auto`}>
        <div className={`relative ${getAspectRatio()} rounded-lg overflow-hidden shadow-lg bg-black`}>
          {parsedVideo.platform === 'youtube' && (
            <iframe
              src={parsedVideo.embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title="Recipe Video"
              loading="lazy"
            />
          )}

          {parsedVideo.platform === 'instagram' && (
            <>
              <iframe
                src={parsedVideo.embedUrl}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                title="Instagram Recipe Video"
                loading="lazy"
                scrolling="no"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                onError={() => setEmbedError(true)}
              />
              {(embedError || (loadAttempted && !embedError)) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
                  <AlertCircle className="w-12 h-12 text-pink-500 mb-3" />
                  <p className="text-sm text-gray-700 text-center mb-3 max-w-xs">
                    Instagram video embed may not display. Tap "Open" above to watch in Instagram.
                  </p>
                </div>
              )}
            </>
          )}

          {parsedVideo.platform === 'tiktok' && (
            <iframe
              src={parsedVideo.embedUrl}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              title="TikTok Recipe Video"
              loading="lazy"
              scrolling="no"
            />
          )}
        </div>

        <div className="mt-2 sm:mt-3">
          <p className="text-[10px] sm:text-xs text-gray-600 text-center">
            {parsedVideo.platform === 'youtube' && (
              <>
                Use controls below video for volume, quality, and fullscreen
              </>
            )}
            {parsedVideo.platform === 'instagram' && (
              <>
                Tap video to play • Tap again for controls
              </>
            )}
            {parsedVideo.platform === 'tiktok' && (
              <>
                Tap video to play • Swipe up/down to adjust volume
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
