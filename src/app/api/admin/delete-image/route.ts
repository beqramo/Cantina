import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth-server';
import { adminStorage } from '@/lib/firebase-admin';

const ALLOWED_FOLDERS = ['dish-images/', 'request-images/'];

/**
 * POST /api/admin/delete-image
 * Body: { imageUrl: string }
 * Deletes the underlying file from Cloud Storage. Requires admin auth.
 * The Firestore record is updated by the caller; this endpoint only
 * cleans up the orphaned storage object.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuthToken();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const imageUrl: string | undefined = body?.imageUrl;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageUrl is required.' },
        { status: 400 },
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: 'Storage bucket not configured.' },
        { status: 500 },
      );
    }

    const expectedPrefix = `https://storage.googleapis.com/${bucketName}/`;
    if (!imageUrl.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: 'Image URL does not match this bucket.' },
        { status: 400 },
      );
    }

    const filename = decodeURIComponent(imageUrl.slice(expectedPrefix.length));
    if (!ALLOWED_FOLDERS.some((folder) => filename.startsWith(folder))) {
      return NextResponse.json(
        { error: 'Refusing to delete file outside of allowed folders.' },
        { status: 400 },
      );
    }

    const bucket = adminStorage.bucket(bucketName);
    await bucket.file(filename).delete({ ignoreNotFound: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Delete Image] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image.' },
      { status: 500 },
    );
  }
}
