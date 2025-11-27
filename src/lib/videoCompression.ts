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

const MAX_VIDEO_SIZE_MB = 10;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const TARGET_BITRATE_KBPS = 2500;

export async function compressVideo(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const originalSize = file.size;
  const originalSizeMB = originalSize / (1024 * 1024);

  onProgress?.({ percent: 5, stage: 'loading' });

  const videoInfo = await getVideoInfo(file);

  onProgress?.({ percent: 15, stage: 'analyzing' });

  const needsCompression =
    originalSizeMB > MAX_VIDEO_SIZE_MB ||
    videoInfo.width > MAX_WIDTH ||
    videoInfo.height > MAX_HEIGHT;

  if (!needsCompression) {
    onProgress?.({ percent: 100, stage: 'complete' });
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }

  onProgress?.({ percent: 25, stage: 'compressing' });

  try {
    const compressedFile = await processVideoWithMediaRecorder(file, videoInfo, onProgress);

    onProgress?.({ percent: 100, stage: 'complete' });

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: ((originalSize - compressedFile.size) / originalSize) * 100,
    };
  } catch (error) {
    console.warn('Video compression failed, using original file:', error);
    onProgress?.({ percent: 100, stage: 'complete' });
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }
}

async function processVideoWithMediaRecorder(
  file: File,
  videoInfo: { width: number; height: number; duration: number },
  onProgress?: (progress: CompressionProgress) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let targetWidth = videoInfo.width;
    let targetHeight = videoInfo.height;

    if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / targetWidth, MAX_HEIGHT / targetHeight);
      targetWidth = Math.floor(targetWidth * ratio);
      targetHeight = Math.floor(targetHeight * ratio);
    }

    if (targetWidth % 2 !== 0) targetWidth -= 1;
    if (targetHeight % 2 !== 0) targetHeight -= 1;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const stream = canvas.captureStream(30);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';

    const bitrate = TARGET_BITRATE_KBPS * 1000;
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      const compressedBlob = new Blob(chunks, { type: mimeType });
      const compressedFile = new File(
        [compressedBlob],
        `${originalName}.${extension}`,
        { type: mimeType }
      );

      URL.revokeObjectURL(video.src);
      resolve(compressedFile);
    };

    mediaRecorder.onerror = (error) => {
      URL.revokeObjectURL(video.src);
      reject(error);
    };

    video.onloadedmetadata = () => {
      video.play();
      mediaRecorder.start();

      let frameCount = 0;
      const totalFrames = Math.ceil(video.duration * 30);

      const drawFrame = () => {
        if (video.ended || video.paused) {
          mediaRecorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        frameCount++;

        const percent = Math.min(95, 25 + (frameCount / totalFrames) * 70);
        onProgress?.({ percent, stage: 'compressing' });

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
    };

    video.onended = () => {
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 100);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
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
