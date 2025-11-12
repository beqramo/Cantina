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
 * Compresses an image file to reduce its size before upload
 * Uses aggressive compression settings to minimize file size while maintaining acceptable quality
 * Automatically converts HEIC/HEIF (iPhone images) to JPEG first
 */
export async function compressImage(file: File): Promise<File> {
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
    maxSizeMB: MAX_IMAGE_SIZE / (1024 * 1024), // Convert to MB (1MB)
    maxWidthOrHeight: MAX_IMAGE_WIDTH, // 1200px
    useWebWorker: true, // Use web worker for better performance
    fileType: processedFile.type, // Use converted file type
    initialQuality: 0.8, // Start with 80% quality for better compression
    alwaysKeepResolution: false, // Allow resizing if needed
    // For JPEG/WebP, use better compression
    ...(processedFile.type === 'image/jpeg' ||
    processedFile.type === 'image/jpg'
      ? {
          initialQuality: 0.75, // Slightly lower quality for JPEG
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
      `Image compressed: ${(processedFile.size / 1024).toFixed(1)}KB → ${(
        compressedFile.size / 1024
      ).toFixed(1)}KB (${compressionRatio}% reduction)`,
    );

    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to compress image: ${error.message}`
        : 'Failed to compress image. Please try a different image.',
    );
  }
}

/**
 * Uploads an image to Firebase Storage after compression
 * Automatically compresses images to reduce upload size
 */
export async function uploadImage(
  file: File,
  isRequest: boolean = false,
): Promise<string> {
  // Validate file size before compression (max 10MB before compression)
  const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_INPUT_SIZE) {
    throw new Error(
      'Image file is too large. Please use an image smaller than 10MB.',
    );
  }

  const { storage } = await import('@/lib/firebase-client');

  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

  try {
    // Compress image before upload
    const compressedFile = await compressImage(file);

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const folder = isRequest ? 'request-images' : 'dish-images';
    const filename = `${folder}/${timestamp}_${randomId}_${compressedFile.name}`;
    const storageRef = ref(storage, filename);

    // Upload compressed file
    await uploadBytes(storageRef, compressedFile);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to upload image: ${error.message}`
        : 'Failed to upload image. Please try again.',
    );
  }
}
