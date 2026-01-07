import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 1 minute

export async function GET(request: Request) {
  // 1. Verify Authentication
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

    // 2. Calculate Cutoff Time (24 hours ago)
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(now - TWENTY_FOUR_HOURS_MS);

    // 3. Query "Expired" Temporary Uploads
    // These are uploads that were logged but never "claimed" (deleted) by a dish request
    const { Timestamp } = require('firebase-admin/firestore');
    const snapshot = await adminDb
      .collection('temporary_uploads')
      .where('createdAt', '<', Timestamp.fromDate(cutoffDate))
      .limit(100) // Batch limit for safety per run
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No expired temporary uploads found',
        deletedCount: 0,
      });
    }

    console.log(
      `[Cleanup Cron] Found ${snapshot.size} expired temporary uploads`,
    );

    // 4. Delete files and tokens
    let deletedCount = 0;
    let errorsCount = 0;

    // We can't use map async directly inside map, so we use Promise.all
    const deletionPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const path = data.path;

      if (!path) return;

      try {
        // Delete from Storage
        const file = bucket.file(path);
        const [exists] = await file.exists();

        if (exists) {
          await file.delete();
        }

        // Delete the log entry
        await doc.ref.delete();
        deletedCount++;
      } catch (err) {
        console.error(`[Cleanup Cron] Failed to delete ${path}:`, err);
        errorsCount++;
      }
    });

    await Promise.allSettled(deletionPromises);

    return NextResponse.json({
      success: true,
      processed: snapshot.size,
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
