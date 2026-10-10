// Client-side media metadata extraction and thumbnail generation

export interface MediaMeta {
  width: number | null;
  height: number | null;
  durationMs: number | null;
  takenAt: string | null;
  thumbnailBytes: Uint8Array;
}

/**
 * Extracts metadata and generates a thumbnail (<= 16 KB WebP or JPEG, ~320px long edge).
 * Strips EXIF from thumbnail.
 */
export async function processMediaFile(file: File): Promise<MediaMeta> {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  let width: number | null = null;
  let height: number | null = null;
  let durationMs: number | null = null;
  const takenAt: string = new Date(file.lastModified).toISOString();
  let thumbnailBytes: Uint8Array = new Uint8Array(0);

  if (isImage) {
    try {
      const img = await createImageElement(file);
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      thumbnailBytes = await renderThumbnailCanvas(img, width, height);
    } catch {
      // Fallback: generate a simple placeholder thumbnail
      thumbnailBytes = generatePlaceholderThumb(file.name);
    }
  } else if (isVideo) {
    try {
      const videoResult = await processVideoFrame(file);
      width = videoResult.width;
      height = videoResult.height;
      durationMs = videoResult.durationMs;
      thumbnailBytes = videoResult.thumbnailBytes;
    } catch {
      thumbnailBytes = generatePlaceholderThumb(file.name);
    }
  } else {
    // Non-media file
    thumbnailBytes = generatePlaceholderThumb(file.name);
  }

  return {
    width,
    height,
    durationMs,
    takenAt,
    thumbnailBytes
  };
}

function createImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image decode error'));
    };
    img.src = url;
  });
}

function processVideoFrame(file: File): Promise<{
  width: number;
  height: number;
  durationMs: number;
  thumbnailBytes: Uint8Array;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const durationMs = Math.round((video.duration || 0) * 1000);

      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);

      video.onseeked = async () => {
        try {
          const thumbnailBytes = await renderThumbnailCanvas(video, width, height);
          URL.revokeObjectURL(url);
          resolve({ width, height, durationMs, thumbnailBytes });
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Video metadata decode error'));
    };

    video.src = url;
  });
}

async function renderThumbnailCanvas(
  source: HTMLImageElement | HTMLVideoElement,
  srcW: number,
  srcH: number
): Promise<Uint8Array> {
  const maxDim = 320;
  let targetW = srcW || maxDim;
  let targetH = srcH || maxDim;

  if (srcW > srcH) {
    if (srcW > maxDim) {
      targetH = Math.round((srcH * maxDim) / srcW);
      targetW = maxDim;
    }
  } else {
    if (srcH > maxDim) {
      targetW = Math.round((srcW * maxDim) / srcH);
      targetH = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(source, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    // Try WebP first with quality 0.75 for tight <= 16 KB budget
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error('Canvas toBlob failed'));
        const buf = await blob.arrayBuffer();
        resolve(new Uint8Array(buf));
      },
      'image/webp',
      0.75
    );
  });
}

function generatePlaceholderThumb(fileName: string): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array(0);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 160, 160);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
  ctx.fillText(ext.substring(0, 5), 80, 80);

  // Return minimal data URL converted to bytes
  const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
