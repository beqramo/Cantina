import imageCompression from 'browser-image-compression';
import { MAX_IMAGE_SIZE, MAX_IMAGE_WIDTH } from './constants';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: MAX_IMAGE_SIZE / (1024 * 1024), // Convert to MB
    maxWidthOrHeight: MAX_IMAGE_WIDTH,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

export async function uploadImage(
  file: File,
  isRequest: boolean = false,
): Promise<string> {
  const { storage } = await import('@/lib/firebase-client');

  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

  // Compress image if needed
  const compressedFile = await compressImage(file);

  // Generate unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const folder = isRequest ? 'request-images' : 'dish-images';
  const filename = `${folder}/${timestamp}_${randomId}_${compressedFile.name}`;
  const storageRef = ref(storage, filename);

  // Upload file
  await uploadBytes(storageRef, compressedFile);

  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}
