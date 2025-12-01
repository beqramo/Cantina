import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { adminStorage } from '@/lib/firebase-admin';
import {
  uploadRateLimiter,
  getClientIP,
  rateLimitHeaders,
  rateLimitExceededResponse,
  validateOrigin,
  detectSuspiciousRequest,
} from '@/lib/rate-limit';
import { verifyTurnstileToken, isTurnstileConfigured } from '@/lib/turnstile';

// Max output size in bytes (500KB)
const MAX_OUTPUT_SIZE = 500 * 1024;
// Max width for images
const MAX_WIDTH = 1200;
// Max input size (10MB)
const MAX_INPUT_SIZE = 10 * 1024 * 1024;
// Allowed input MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
// Allowed folders (prevent directory traversal)
const ALLOWED_FOLDERS = ['dish-images', 'request-images'];

/**
 * Compress image using sharp with iterative quality reduction
 * Ensures output is under MAX_OUTPUT_SIZE
 */
async function compressImage(
  buffer: Buffer,
  _mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  let sharpInstance = sharp(buffer);

  // Get image metadata
  const metadata = await sharpInstance.metadata();

  // Resize if needed
  if (metadata.width && metadata.width > MAX_WIDTH) {
    sharpInstance = sharpInstance.resize(MAX_WIDTH, undefined, {
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  // Output format - prefer webp for best compression
  const outputMimeType = 'image/webp';

  // Start with quality 85 and reduce until size is acceptable
  let quality = 85;
  let compressedBuffer: Buffer;

  while (quality >= 20) {
    compressedBuffer = await sharpInstance
      .clone()
      .webp({
        quality,
        effort: 6, // Higher effort = better compression
        smartSubsample: true,
      })
      .toBuffer();

    console.log(
      `[Image Compression] Quality: ${quality}, Size: ${(
        compressedBuffer.length / 1024
      ).toFixed(1)}KB`,
    );

    if (compressedBuffer.length <= MAX_OUTPUT_SIZE) {
      return { buffer: compressedBuffer, mimeType: outputMimeType };
    }

    // Reduce quality by 10% for next iteration
    quality -= 10;
  }

  // If still too large, try more aggressive resize
  const currentMetadata = await sharp(buffer).metadata();
  if (currentMetadata.width && currentMetadata.width > 800) {
    sharpInstance = sharp(buffer).resize(800, undefined, {
      withoutEnlargement: true,
      fit: 'inside',
    });

    compressedBuffer = await sharpInstance
      .webp({
        quality: 60,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();

    console.log(
      `[Image Compression] Aggressive resize, Size: ${(
        compressedBuffer.length / 1024
      ).toFixed(1)}KB`,
    );

    if (compressedBuffer.length <= MAX_OUTPUT_SIZE) {
      return { buffer: compressedBuffer, mimeType: outputMimeType };
    }
  }

  // Final attempt with very aggressive settings
  compressedBuffer = await sharp(buffer)
    .resize(600, undefined, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({
      quality: 40,
      effort: 6,
      smartSubsample: true,
    })
    .toBuffer();

  console.log(
    `[Image Compression] Final attempt, Size: ${(
      compressedBuffer.length / 1024
    ).toFixed(1)}KB`,
  );

  return { buffer: compressedBuffer, mimeType: outputMimeType };
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // ===== SECURITY CHECK 1: Rate Limiting =====
  const rateLimitResult = uploadRateLimiter.check(clientIP);
  if (!rateLimitResult.success) {
    console.warn(`[Image Upload] Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitExceededResponse(rateLimitResult);
  }

  // ===== SECURITY CHECK 2: Origin Validation (CSRF prevention) =====
  if (!validateOrigin(request)) {
    console.warn(`[Image Upload] Invalid origin from IP: ${clientIP}`);
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403, headers: rateLimitHeaders(rateLimitResult) },
    );
  }

  // ===== SECURITY CHECK 3: Suspicious Request Detection =====
  const suspiciousCheck = detectSuspiciousRequest(request);
  if (suspiciousCheck.suspicious) {
    console.warn(
      `[Image Upload] Suspicious request from ${clientIP}: ${suspiciousCheck.reason}`,
    );
    // Don't outright block, but log for monitoring
    // In production, you might want to add additional verification here
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const folder = (formData.get('folder') as string) || 'dish-images';
    const turnstileToken = formData.get('turnstile-token') as string | null;
    const internalApiKey = formData.get('internal-api-key') as string | null;

    // ===== SECURITY CHECK 4: Turnstile CAPTCHA Verification =====
    // Internal API key bypasses Turnstile (for scripts/server-side uploads)
    const hasValidInternalKey =
      process.env.INTERNAL_UPLOAD_API_KEY &&
      internalApiKey === process.env.INTERNAL_UPLOAD_API_KEY;

    if (hasValidInternalKey) {
      console.log('[Image Upload] Using internal API key - skipping Turnstile');
    } else if (isTurnstileConfigured()) {
      if (!turnstileToken) {
        return NextResponse.json(
          {
            error: 'Verification required. Please complete the security check.',
          },
          { status: 400, headers: rateLimitHeaders(rateLimitResult) },
        );
      }

      const turnstileResult = await verifyTurnstileToken(
        turnstileToken,
        clientIP,
      );
      if (!turnstileResult.success) {
        console.warn(
          `[Image Upload] Turnstile verification failed for IP: ${clientIP}`,
        );
        return NextResponse.json(
          { error: turnstileResult.error || 'Verification failed' },
          { status: 403, headers: rateLimitHeaders(rateLimitResult) },
        );
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) },
      );
    }

    // ===== SECURITY CHECK 5: Folder Validation (prevent directory traversal) =====
    if (!ALLOWED_FOLDERS.includes(folder)) {
      console.warn(
        `[Image Upload] Invalid folder attempt: ${folder} from IP: ${clientIP}`,
      );
      return NextResponse.json(
        { error: 'Invalid upload folder' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) },
      );
    }

    // Validate file type
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isValidType =
      ALLOWED_TYPES.includes(fileType) ||
      fileName.endsWith('.heic') ||
      fileName.endsWith('.heif');

    if (!isValidType) {
      return NextResponse.json(
        {
          error:
            'Invalid image type. Please upload a JPEG, PNG, WebP, or HEIC image.',
        },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) },
      );
    }

    // Validate file size (max 10MB input)
    if (file.size > MAX_INPUT_SIZE) {
      return NextResponse.json(
        {
          error:
            'Image file is too large. Please use an image smaller than 10MB.',
        },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    console.log(
      `[Image Upload] Original size: ${(inputBuffer.length / 1024).toFixed(
        1,
      )}KB from IP: ${clientIP}`,
    );

    // ===== SECURITY CHECK 5: Deep Image Validation =====
    // Verify the file is actually a valid image by parsing it with sharp
    // This catches malicious files with spoofed MIME types
    try {
      const metadata = await sharp(inputBuffer).metadata();
      if (!metadata.format || !metadata.width || !metadata.height) {
        throw new Error('Invalid image data');
      }
      // Additional sanity checks
      if (metadata.width > 10000 || metadata.height > 10000) {
        return NextResponse.json(
          { error: 'Image dimensions are too large' },
          { status: 400, headers: rateLimitHeaders(rateLimitResult) },
        );
      }
    } catch {
      console.warn(`[Image Upload] Invalid image content from IP: ${clientIP}`);
      return NextResponse.json(
        {
          error:
            'Invalid image file. The file appears to be corrupted or not a valid image.',
        },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) },
      );
    }

    // Compress image
    const { buffer: compressedBuffer, mimeType: outputMimeType } =
      await compressImage(inputBuffer, fileType);

    const compressionRatio = (
      (1 - compressedBuffer.length / inputBuffer.length) *
      100
    ).toFixed(1);
    console.log(
      `[Image Upload] Compressed: ${(inputBuffer.length / 1024).toFixed(
        1,
      )}KB → ${(compressedBuffer.length / 1024).toFixed(
        1,
      )}KB (${compressionRatio}% reduction)`,
    );

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const extension = outputMimeType === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${folder}/${timestamp}_${randomId}.${extension}`;

    // Get the bucket
    const bucket = adminStorage.bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    );
    const fileRef = bucket.file(filename);

    // Upload to Firebase Storage
    await fileRef.save(compressedBuffer, {
      metadata: {
        contentType: outputMimeType,
        metadata: {
          originalName: file.name,
          originalSize: inputBuffer.length.toString(),
          compressedSize: compressedBuffer.length.toString(),
        },
      },
    });

    // Make the file publicly accessible
    await fileRef.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        originalSize: inputBuffer.length,
        compressedSize: compressedBuffer.length,
      },
      { headers: rateLimitHeaders(rateLimitResult) },
    );
  } catch (error) {
    console.error('[Image Upload] Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upload image. Please try again.',
      },
      { status: 500, headers: rateLimitHeaders(rateLimitResult) },
    );
  }
}
