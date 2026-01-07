import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';
import { DishRequestEmail } from '@/components/emails/DishRequestEmail';
import { DishCategory, DishTag, DishStatus } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import {
  uploadRateLimiter,
  getClientIP,
  rateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/rate-limit'; // Reuse rate limiter for now or create a new one
import { verifyTurnstileToken, isTurnstileConfigured } from '@/lib/turnstile';

// Helper to generate search tokens
// ... (omitted for brevity, keep existing function)
function generateSearchTokens(name: string): string[] {
  const tokens = new Set<string>();
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normalized.length > 0) tokens.add(normalized);

  const words = normalized.split(/\s+/).filter((w) => w.length > 0);
  words.forEach((word) => {
    tokens.add(word);
    const minPrefix = word.length <= 4 ? 2 : 3;
    for (let i = minPrefix; i <= word.length; i++) {
      tokens.add(word.substring(0, i));
    }
  });

  const originalLower = name.toLowerCase().trim();
  if (originalLower.length > 0 && originalLower !== normalized) {
    tokens.add(originalLower);
  }

  return Array.from(tokens);
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Rate Limiting
  const rateLimitResult = uploadRateLimiter.check(clientIP);
  if (!rateLimitResult.success) {
    console.warn(`[Dish Request] Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const data = await request.json();
    const {
      name,
      imageUrl,
      category,
      tags,
      requestedBy,
      nickname,
      turnstileToken,
    } = data;

    // Turnstile Verification
    if (isTurnstileConfigured()) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: 'Verification required' },
          { status: 400, headers: rateLimitHeaders(rateLimitResult) },
        );
      }

      const turnstileResult = await verifyTurnstileToken(
        turnstileToken,
        clientIP,
      );
      if (!turnstileResult.success) {
        console.warn(
          `[Dish Request] Turnstile verification failed: ${turnstileResult.error}`,
        );
        return NextResponse.json(
          { error: turnstileResult.error || 'Verification failed' },
          { status: 403, headers: rateLimitHeaders(rateLimitResult) },
        );
      }
    }

    if (!name || !requestedBy) {
      return NextResponse.json(
        { error: 'Name and requestedBy are required' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) },
      );
    }

    const now = Timestamp.now();
    const nameTokens = generateSearchTokens(name);

    // Create dish in Firestore
    const dishData = {
      name,
      nameTokens,
      imageUrl: imageUrl || '',
      images: imageUrl ? [imageUrl] : [],
      category: category || null,
      tags: tags || [],
      status: 'pending' as DishStatus,
      requestedBy,
      nickname: nickname || null,
      imageProviderNickname: null,
      thumbsUp: 0,
      thumbsDown: 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection('dishes').add(dishData);

    // Send email notification
    const subject = `New Dish Request: ${name}`;

    // Fire and forget email
    sendEmail({
      subject,
      react: (
        <DishRequestEmail
          name={name}
          requestedBy={requestedBy}
          nickname={nickname || undefined}
          imageUrl={imageUrl}
          category={category || undefined}
          tags={tags}
        />
      ),
    }).catch((error) =>
      console.error('Failed to send dish request email:', error),
    );

    return NextResponse.json(
      {
        success: true,
        id: docRef.id,
      },
      { headers: rateLimitHeaders(rateLimitResult) },
    );
  } catch (error) {
    console.error('Error creating dish request:', error);
    return NextResponse.json(
      { error: 'Failed to create dish request' },
      { status: 500, headers: rateLimitHeaders(rateLimitResult) },
    );
  }
}
