import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 1 minute for execution

export async function GET(request: Request) {
  // 1. Verify Authentication (CRON_SECRET)
  // Vercel automatically invokes crons with this header if configured
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bucket = adminStorage.bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    );

    // 2. Collect Active Image URLs from Firestore
    // Scan 'dishes' collection
    const snapshot = await adminDb.collection('dishes').get();
    const activeImagePaths = new Set<string>();

    // Track stats
    let totalDishes = 0;

    snapshot.forEach((doc) => {
      totalDishes++;
      const data = doc.data();

      // Main image
      if (data.imageUrl) {
        extractPathFromUrl(data.imageUrl, activeImagePaths);
      }

      // Additional images array
      if (Array.isArray(data.images)) {
        data.images.forEach((url: string) =>
          extractPathFromUrl(url, activeImagePaths),
        );
      }

      // Pending review images
      if (Array.isArray(data.pendingImages)) {
        data.pendingImages.forEach((item: any) => {
          if (item && item.imageUrl) {
            extractPathFromUrl(item.imageUrl, activeImagePaths);
          }
        });
      }
    });

    console.log(
      `[Cleanup Cron] Found ${totalDishes} dishes with ${activeImagePaths.size} unique active images`,
    );

    // 3. List and Filter Storage Files
    const [files] = await bucket.getFiles({ prefix: 'dish-images/' });
    const [requestFiles] = await bucket.getFiles({ prefix: 'request-images/' });
    const allFiles = [...files, ...requestFiles];

    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    const filesToDelete: any[] = [];

    allFiles.forEach((file) => {
      // Safety check: Skip files created in last 24h
      const createdTime = new Date(
        file.metadata.timeCreated as string,
      ).getTime();
      if (now - createdTime < TWENTY_FOUR_HOURS_MS) {
        return;
      }

      // Check if file is in use
      // File name includes the folder, e.g., 'dish-images/123.jpg'
      if (!activeImagePaths.has(file.name)) {
        filesToDelete.push(file);
      }
    });

    // 4. Delete Unused Files
    console.log(
      `[Cleanup Cron] Found ${filesToDelete.length} unused files to delete`,
    );

    let deletedCount = 0;
    let errorsCount = 0;

    // Process deletions in parallel batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < filesToDelete.length; i += BATCH_SIZE) {
      const batch = filesToDelete.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((file) => file.delete()),
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          deletedCount++;
        } else {
          console.error('[Cleanup Cron] Deletion failed:', result.reason);
          errorsCount++;
        }
      });
    }

    return NextResponse.json({
      success: true,
      scannedDishes: totalDishes,
      activeImages: activeImagePaths.size,
      scannedFiles: allFiles.length,
      deletedFiles: deletedCount,
      errors: errorsCount,
    });
  } catch (error) {
    console.error('[Cleanup Cron] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * Extracts storage path from a full URL or stores if it looks like a path
 * URL format: https://storage.googleapis.com/BUCKET_NAME/folder/filename.ext
 * or Google URL format
 */
function extractPathFromUrl(url: string, set: Set<string>) {
  if (!url) return;

  try {
    const decdodedUrl = decodeURIComponent(url);

    // Match common Firebase/GCP storage URL patterns
    // We want the part after the bucket name /o/ or just the path if it's direct
    // Example: .../o/dish-images%2F123.jpg... -> dish-images/123.jpg

    // Pattern for standard Firebase Storage URLs
    const firebaseUrlMatch = decdodedUrl.match(/\/o\/(.+?)(\?|$)/);
    if (firebaseUrlMatch && firebaseUrlMatch[1]) {
      set.add(firebaseUrlMatch[1]);
      return;
    }

    // Pattern for direct GCS URLs
    const gcsUrlMatch = decdodedUrl.match(
      /storage\.googleapis\.com\/[^/]+\/(.+)/,
    );
    if (gcsUrlMatch && gcsUrlMatch[1]) {
      set.add(gcsUrlMatch[1]);
      return;
    }

    // Fallback: assume it might be a relative path or raw path
    if (url.includes('dish-images/') || url.includes('request-images/')) {
      // Try to clean it up if it's a full URL
      const lastSlash = url.lastIndexOf('dish-images/');
      if (lastSlash !== -1) {
        set.add(url.substring(lastSlash));
        return;
      }
      const lastSlashReq = url.lastIndexOf('request-images/');
      if (lastSlashReq !== -1) {
        set.add(url.substring(lastSlashReq));
        return;
      }
    }
  } catch (e) {
    console.warn('[Cleanup Cron] Failed to parse URL:', url);
  }
}
