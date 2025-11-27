export interface CompressionProgress {
  percent: number;
  stage: 'loading' | 'analyzing' | 'compressing' | 'complete';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const MAX_VIDEO_SIZE_MB = 50;

export async function compressVideo(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const originalSize = file.size;
  const originalSizeMB = originalSize / (1024 * 1024);

  onProgress?.({ percent: 50, stage: 'loading' });

  if (originalSizeMB > MAX_VIDEO_SIZE_MB) {
    console.warn(`Video is ${originalSizeMB.toFixed(1)}MB (max ${MAX_VIDEO_SIZE_MB}MB). This may take longer to upload.`);
  }

  onProgress?.({ percent: 100, stage: 'complete' });

  return {
    file,
    originalSize,
    compressedSize: originalSize,
    compressionRatio: 0,
  };
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

export async function getVideoInfo(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  size: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        size: file.size,
      });
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
  });
}
