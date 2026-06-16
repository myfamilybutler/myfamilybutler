/**
 * Shared media validation helpers for webhook-downloaded files.
 */

export const MAX_DOWNLOADED_MEDIA_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

export const ALLOWED_AUDIO_TYPES = [
  'audio/ogg',
  'audio/opus',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/aac',
];

export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

export function isAllowedMimeType(mimeType: string): boolean {
  return (
    ALLOWED_IMAGE_TYPES.includes(mimeType) ||
    ALLOWED_AUDIO_TYPES.includes(mimeType) ||
    ALLOWED_DOCUMENT_TYPES.includes(mimeType)
  );
}

export function assertDownloadedMediaIsSafe(
  buffer: Buffer,
  mimeType: string
): { valid: true } | { valid: false; error: string } {
  if (buffer.length > MAX_DOWNLOADED_MEDIA_SIZE_BYTES) {
    return {
      valid: false,
      error: `Downloaded media too large (max ${MAX_DOWNLOADED_MEDIA_SIZE_BYTES / 1024 / 1024} MB)`,
    };
  }
  if (!isAllowedMimeType(mimeType)) {
    return { valid: false, error: `Unsupported media type: ${mimeType}` };
  }
  return { valid: true };
}
