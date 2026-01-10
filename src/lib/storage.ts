import imageCompression, { Options } from 'browser-image-compression';
import { MAX_IMAGE_SIZE, MAX_IMAGE_WIDTH } from './constants';

// Allowed image MIME types for input (including HEIC for iPhone support)
const ALLOWED_INPUT_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

// Allowed image MIME types after conversion (for compression)
const ALLOWED_OUTPUT_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

/**
 * Checks if a file is HEIC/HEIF format (iPhone images)
 */
function isHeicFile(file: File): boolean {
  const heicTypes = ['image/heic', 'image/heif'];
  const heicExtensions = ['.heic', '.heif'];

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return (
    heicTypes.includes(fileType) ||
    heicExtensions.some((ext) => fileName.endsWith(ext))
  );
}

/**
 * Converts HEIC/HEIF image to JPEG format
 * iPhone images are often in HEIC format which browsers don't support natively
 * Uses dynamic import to avoid SSR issues since heic2any requires window object
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  // Ensure we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('HEIC conversion is only available in the browser');
  }

  try {
    console.log('Converting HEIC image to JPEG...');

    // Dynamically import heic2any only when needed (client-side only)
    const heic2any = (await import('heic2any')).default;

    // Convert HEIC to JPEG using heic2any
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 1.0, // Maximum quality, compression will happen later
    });

    // heic2any returns an array, take the first result
    const blob = Array.isArray(convertedBlob)
      ? convertedBlob[0]
      : convertedBlob;

    // Create a new File object with JPEG MIME type
    const jpegFile = new File(
      [blob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      },
    );

    console.log(
      `HEIC converted: ${(file.size / 1024).toFixed(1)}KB → ${(
        jpegFile.size / 1024
      ).toFixed(1)}KB`,
    );

    return jpegFile;
  } catch (error) {
    console.error('Error converting HEIC image:', error);
    throw new Error(
      'Failed to convert HEIC image. Please try converting it to JPEG first.',
    );
  }
}

/**
 * Validates if the file is a valid image type (including HEIC for iPhone support)
 */
function validateImageType(file: File): void {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // Check MIME type
  if (fileType && ALLOWED_INPUT_IMAGE_TYPES.includes(fileType)) {
    return;
  }

  // Check file extension (for cases where MIME type might not be set correctly)
  const hasValidExtension = ALLOWED_INPUT_IMAGE_TYPES.some((type) => {
    const extension = type.split('/')[1];
    return (
      fileName.endsWith(`.${extension}`) ||
      fileName.endsWith('.heic') ||
      fileName.endsWith('.heif')
    );
  });

  if (hasValidExtension) {
    return;
  }

  throw new Error(
    'Invalid image type. Please upload a JPEG, PNG, WebP, or HEIC image.',
  );
}

/**
 * Client-side image compression using browser-image-compression
 * Used as a pre-processing step before server-side compression
 */
async function compressImageClientSide(file: File): Promise<File> {
  // Validate image type
  validateImageType(file);

  // Convert HEIC/HEIF to JPEG if needed (iPhone images)
  let processedFile = file;
  if (isHeicFile(file)) {
    processedFile = await convertHeicToJpeg(file);
  }

  // Validate that we have a supported output format
  const outputType = processedFile.type.toLowerCase();
  if (!ALLOWED_OUTPUT_IMAGE_TYPES.includes(outputType)) {
    throw new Error(
      'Unsupported image format after conversion. Please try a different image.',
    );
  }

  // If file is already small enough, return as-is
  if (processedFile.size <= MAX_IMAGE_SIZE) {
    return processedFile;
  }

  const options: Options = {
    maxSizeMB: MAX_IMAGE_SIZE / (1024 * 1024), // Convert to MB (0.5MB / 500KB)
    maxWidthOrHeight: MAX_IMAGE_WIDTH, // 1200px
    useWebWorker: true, // Use web worker for better performance
    fileType: processedFile.type, // Use converted file type
    initialQuality: 0.7, // Start with 70% quality for better compression
    alwaysKeepResolution: false, // Allow resizing if needed
    // For JPEG/WebP, use better compression
    ...(processedFile.type === 'image/jpeg' ||
    processedFile.type === 'image/jpg'
      ? {
          initialQuality: 0.65, // Lower quality for JPEG
        }
      : {}),
  };

  try {
    const compressedFile = await imageCompression(processedFile, options);

    // Log compression results
    const compressionRatio = (
      (1 - compressedFile.size / processedFile.size) *
      100
    ).toFixed(1);
    console.log(
      `[Client] Image compressed: ${(processedFile.size / 1024).toFixed(
        1,
      )}KB → ${(compressedFile.size / 1024).toFixed(
        1,
      )}KB (${compressionRatio}% reduction)`,
    );

    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original file if compression fails - server will handle it
    return processedFile;
  }
}

/**
 * Legacy compress function for backward compatibility
 * @deprecated Use uploadImage instead which handles compression automatically
 */
export async function compressImage(file: File): Promise<File> {
  return compressImageClientSide(file);
}

interface UploadImageOptions {
  /** If true, uploads to request-images folder instead of dish-images */
  isRequest?: boolean;
  /** Turnstile verification token (required if Turnstile is configured on server) */
  turnstileToken?: string;
  /** Internal API key for server-side/script uploads (bypasses Turnstile) */
  internalApiKey?: string;
  /** Name of the dish (for email notifications) */
  dishName?: string;
  /** Nickname of the uploader (for email notifications) */
  nickname?: string;
}

/**
 * Uploads an image via server-side API for optimal compression
 * Uses sharp on the server for reliable compression to under 500KB
 *
 * @param file - The image file to upload
 * @param optionsOrIsRequest - Options object or boolean for backward compatibility
 * @param turnstileToken - Optional Turnstile verification token (deprecated, use options)
 */
export async function uploadImage(
  file: File,
  optionsOrIsRequest: boolean | UploadImageOptions = false,
  turnstileToken?: string,
): Promise<string> {
  // Handle both old and new API signatures
  const options: UploadImageOptions =
    typeof optionsOrIsRequest === 'boolean'
      ? { isRequest: optionsOrIsRequest, turnstileToken }
      : optionsOrIsRequest;

  const {
    isRequest = false,
    turnstileToken: token,
    internalApiKey,
    dishName,
    nickname,
  } = options;

  // Validate file size before processing (max 10MB before compression)
  const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_INPUT_SIZE) {
    throw new Error(
      'Image file is too large. Please use an image smaller than 10MB.',
    );
  }

  // Validate image type
  validateImageType(file);

  try {
    // Pre-process: Convert HEIC to JPEG and do initial client-side compression
    // This reduces the payload sent to the server
    let processedFile = file;

    // Convert HEIC first (server sharp can't handle HEIC directly)
    if (isHeicFile(file)) {
      processedFile = await convertHeicToJpeg(file);
    }

    // Do client-side compression to reduce upload size
    // Server will do final optimization
    if (processedFile.size > 2 * 1024 * 1024) {
      // If larger than 2MB
      processedFile = await compressImageClientSide(processedFile);
    }

    // Upload via server API
    const folder = isRequest ? 'request-images' : 'dish-images';
    const formData = new FormData();
    formData.append('image', processedFile);
    formData.append('folder', folder);

    // Include Turnstile token if provided (for CAPTCHA verification)
    if (token) {
      formData.append('turnstile-token', token);
    }

    // Include internal API key if provided (for script/server-side uploads)
    if (internalApiKey) {
      formData.append('internal-api-key', internalApiKey);
    }

    // Include metadata for notifications
    if (dishName) {
      formData.append('dishName', dishName);
    }
    if (nickname) {
      formData.append('nickname', nickname);
    }

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Upload failed with status ${response.status}`,
      );
    }

    const result = await response.json();

    if (!result.success || !result.url) {
      throw new Error(result.error || 'Failed to upload image');
    }

    console.log(
      `[Upload] Success: ${(result.originalSize / 1024).toFixed(1)}KB → ${(
        result.compressedSize / 1024
      ).toFixed(1)}KB`,
    );

    return result.url;
  } catch (error) {
    console.error('Error uploading image:', error);

    throw error;
  }
}
