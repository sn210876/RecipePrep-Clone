export type VideoPlatform = 'youtube' | 'instagram' | 'tiktok' | 'unknown';

export interface ParsedVideo {
  platform: VideoPlatform;
  id: string;
  embedUrl: string;
  originalUrl: string;
}

export function parseVideoUrl(url: string): ParsedVideo | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  if (isYouTubeUrl(trimmedUrl)) {
    return parseYouTubeUrl(trimmedUrl);
  }

  if (isInstagramUrl(trimmedUrl)) {
    return parseInstagramUrl(trimmedUrl);
  }

  if (isTikTokUrl(trimmedUrl)) {
    return parseTikTokUrl(trimmedUrl);
  }

  return null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function isInstagramUrl(url: string): boolean {
  return url.includes('instagram.com');
}

function isTikTokUrl(url: string): boolean {
  return url.includes('tiktok.com');
}

function parseYouTubeUrl(url: string): ParsedVideo | null {
  try {
    const urlObj = new URL(url);
    let videoId: string | null = null;
    let startTime: string | null = null;

    if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1).split('?')[0];
      startTime = urlObj.searchParams.get('t');
    } else if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1].split('?')[0];
      } else if (urlObj.pathname.includes('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1].split('?')[0];
      } else {
        videoId = urlObj.searchParams.get('v');
        startTime = urlObj.searchParams.get('t');
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return null;
    }

    let embedUrl = `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`;

    if (startTime) {
      const timeInSeconds = startTime.replace('s', '');
      embedUrl += `&start=${timeInSeconds}`;
    }

    return {
      platform: 'youtube',
      id: videoId,
      embedUrl,
      originalUrl: url,
    };
  } catch (error) {
    return null;
  }
}

function parseInstagramUrl(url: string): ParsedVideo | null {
  try {
    const urlObj = new URL(url);

    const reelMatch = url.match(/\/reel\/([A-Za-z0-9_-]+)/);
    const postMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/);
    const tvMatch = url.match(/\/tv\/([A-Za-z0-9_-]+)/);

    let postId: string | null = null;
    let type: 'reel' | 'p' | 'tv' = 'p';

    if (reelMatch) {
      postId = reelMatch[1];
      type = 'reel';
    } else if (postMatch) {
      postId = postMatch[1];
      type = 'p';
    } else if (tvMatch) {
      postId = tvMatch[1];
      type = 'tv';
    }

    if (!postId) {
      return null;
    }

    const embedUrl = `https://www.instagram.com/${type}/${postId}/embed/captioned/?cr=1&v=14`;

    return {
      platform: 'instagram',
      id: postId,
      embedUrl,
      originalUrl: url,
    };
  } catch (error) {
    return null;
  }
}

function parseTikTokUrl(url: string): ParsedVideo | null {
  try {
    const urlObj = new URL(url);

    const videoMatch = url.match(/\/video\/(\d+)/);
    const vmMatch = url.match(/\/v\/([A-Za-z0-9]+)/);
    const atMatch = url.match(/@[\w.-]+\/video\/(\d+)/);

    let videoId: string | null = null;

    if (videoMatch) {
      videoId = videoMatch[1];
    } else if (vmMatch) {
      videoId = vmMatch[1];
    } else if (atMatch) {
      videoId = atMatch[1];
    }

    if (!videoId) {
      return null;
    }

    const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;

    return {
      platform: 'tiktok',
      id: videoId,
      embedUrl,
      originalUrl: url,
    };
  } catch (error) {
    return null;
  }
}

export function isValidVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}

export function getVideoPlatform(url: string): VideoPlatform {
  const parsed = parseVideoUrl(url);
  return parsed ? parsed.platform : 'unknown';
}
