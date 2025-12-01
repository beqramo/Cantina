/**
 * Cloudflare Turnstile CAPTCHA Integration
 *
 * Turnstile is a free, privacy-preserving alternative to CAPTCHA.
 * Often works invisibly without user interaction.
 *
 * Setup:
 * 1. Go to https://dash.cloudflare.com → Turnstile
 * 2. Add your site and get keys
 * 3. Add to .env.local:
 *    NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
 *    TURNSTILE_SECRET_KEY=your-secret-key
 *
 * For testing, use these keys:
 *   Site Key: 1x00000000000000000000AA (always passes)
 *   Secret Key: 1x0000000000000000000000000000000AA (always passes)
 */

/**
 * Verify a Turnstile token server-side
 * Call this in your API route before processing the request
 */
export async function verifyTurnstileToken(
  token: string,
  clientIP?: string,
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If Turnstile is not configured, skip verification (dev mode)
  if (!secretKey) {
    console.warn(
      '[Turnstile] Secret key not configured - skipping verification',
    );
    return { success: true };
  }

  if (!token) {
    return { success: false, error: 'Missing verification token' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (clientIP) {
      formData.append('remoteip', clientIP);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      },
    );

    const result = await response.json();

    if (result.success) {
      return { success: true };
    }

    // Log error codes for debugging
    console.warn('[Turnstile] Verification failed:', result['error-codes']);
    return {
      success: false,
      error: 'Verification failed. Please try again.',
    };
  } catch (error) {
    console.error('[Turnstile] Verification error:', error);
    // In case of network errors, you might want to allow the request
    // or implement retry logic. For security, we fail closed here.
    return {
      success: false,
      error: 'Verification service unavailable. Please try again.',
    };
  }
}

/**
 * Check if Turnstile is configured
 */
export function isTurnstileConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    process.env.TURNSTILE_SECRET_KEY
  );
}

/**
 * Get the public site key for the client
 */
export function getTurnstileSiteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}
