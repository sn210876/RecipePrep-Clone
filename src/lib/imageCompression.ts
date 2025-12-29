import imageCompression from 'browser-image-compression';

export interface CompressionProgress {
  percent: number;
  originalSize: number;
  currentSize?: number;
  isCompressing: boolean;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const DEFAULT_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
};

/**
 * Compresses an image file for web upload
 * @param file - The original image file
 * @param onProgress - Optional callback for compression progress
 * @returns Promise with compression result
 */
export async function compressImage(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const originalSize = file.size;

  onProgress?.({
    percent: 0,
    originalSize,
    isCompressing: true,
  });

  try {
    const compressedFile = await imageCompression(file, {
      ...DEFAULT_OPTIONS,
      onProgress: (percent: number) => {
        onProgress?.({
          percent,
          originalSize,
          isCompressing: true,
        });
      },
    });

    const compressedSize = compressedFile.size;
    const compressionRatio = (compressedSize / originalSize) * 100;

    onProgress?.({
      percent: 100,
      originalSize,
      currentSize: compressedSize,
      isCompressing: false,
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    // If compression fails, return the original file
    onProgress?.({
      percent: 100,
      originalSize,
      currentSize: originalSize,
      isCompressing: false,
    });
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 100,
    };
  }
}

/**
 * Compresses multiple images in parallel
 * @param files - Array of image files to compress
 * @param onProgress - Optional callback for overall progress
 * @returns Promise with array of compression results
 */
export async function compressMultipleImages(
  files: File[],
  onProgress?: (currentIndex: number, total: number, progress: CompressionProgress) => void
): Promise<CompressionResult[]> {
  const compressionPromises = files.map((file, index) =>
    compressImage(file, (progress) => {
      onProgress?.(index, files.length, progress);
    })
  );

  return Promise.all(compressionPromises);
}

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validates if file is an image
 * @param file - File to validate
 * @returns True if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Gets dimensions of an image file
 * @param file - Image file
 * @returns Promise with width and height
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Compresses image with custom options
 * @param file - The original image file
 * @param options - Custom compression options
 * @param onProgress - Optional callback for compression progress
 * @returns Promise with compression result
 */
export async function compressImageWithOptions(
  file: File,
  options: Partial<typeof DEFAULT_OPTIONS>,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const originalSize = file.size;

  onProgress?.({
    percent: 0,
    originalSize,
    isCompressing: true,
  });

  try {
    const compressedFile = await imageCompression(file, {
      ...DEFAULT_OPTIONS,
      ...options,
      onProgress: (percent: number) => {
        onProgress?.({
          percent,
          originalSize,
          isCompressing: true,
        });
      },
    });

    const compressedSize = compressedFile.size;
    const compressionRatio = (compressedSize / originalSize) * 100;

    onProgress?.({
      percent: 100,
      originalSize,
      currentSize: compressedSize,
      isCompressing: false,
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    // If compression fails, return the original file
    onProgress?.({
      percent: 100,
      originalSize,
      currentSize: originalSize,
      isCompressing: false,
    });
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 100,
    };
  }
}
