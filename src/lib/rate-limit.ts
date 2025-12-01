/**
 * Rate limiting utility for API endpoints
 *
 * This provides in-memory rate limiting suitable for single-instance deployments.
 * For production with multiple instances, consider using:
 * - Upstash Redis (@upstash/ratelimit)
 * - Vercel Edge Config
 * - External rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Unique identifier for this rate limiter (for logging) */
  identifier?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

class RateLimiter {
  private cache: Map<string, RateLimitEntry> = new Map();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      identifier: 'default',
      ...config,
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check if a request should be allowed
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.cache.get(key);

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.config.windowSeconds * 1000;
      this.cache.set(key, { count: 1, resetTime });

      return {
        success: true,
        remaining: this.config.limit - 1,
        reset: resetTime,
        limit: this.config.limit,
      };
    }

    // Increment count
    entry.count++;
    this.cache.set(key, entry);

    const success = entry.count <= this.config.limit;

    if (!success) {
      console.warn(
        `[Rate Limit] ${
          this.config.identifier
        }: Limit exceeded for key ${key.substring(0, 20)}...`,
      );
    }

    return {
      success,
      remaining: Math.max(0, this.config.limit - entry.count),
      reset: entry.resetTime,
      limit: this.config.limit,
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `[Rate Limit] ${this.config.identifier}: Cleaned ${cleaned} expired entries`,
      );
    }
  }
}

// Pre-configured rate limiters for different use cases
// Adjust these values based on your expected traffic

/**
 * Rate limiter for image uploads
 * Default: 10 uploads per minute per IP
 */
export const uploadRateLimiter = new RateLimiter({
  limit: 10,
  windowSeconds: 60,
  identifier: 'upload',
});

/**
 * Rate limiter for general API requests
 * Default: 100 requests per minute per IP
 */
export const apiRateLimiter = new RateLimiter({
  limit: 100,
  windowSeconds: 60,
  identifier: 'api',
});

/**
 * Stricter rate limiter for sensitive operations
 * Default: 5 requests per minute per IP
 */
export const strictRateLimiter = new RateLimiter({
  limit: 5,
  windowSeconds: 60,
  identifier: 'strict',
});

/**
 * Extract client IP from request headers
 * Handles various proxy configurations
 */
export function getClientIP(request: Request): string {
  // Check various headers that might contain the real IP
  const headers = request.headers;

  // Vercel/Cloudflare headers
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;

  // X-Forwarded-For (can contain multiple IPs, first is client)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    return ips[0];
  }

  // X-Real-IP
  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP;

  // Fallback - this might not be the real IP behind a proxy
  return 'unknown';
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Create a standardized rate limit exceeded response
 */
export function rateLimitExceededResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        ...rateLimitHeaders(result),
      },
    },
  );
}

/**
 * Validate request origin to prevent CSRF
 * Returns true if the request appears legitimate
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Get allowed origins from environment
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean) as string[];

  // If no origin check configured, allow (but log warning)
  if (allowedOrigins.length === 0) {
    console.warn(
      '[Security] No NEXT_PUBLIC_SITE_URL configured - origin validation disabled',
    );
    return true;
  }

  // Check origin header
  if (origin) {
    return allowedOrigins.some((allowed) => origin.startsWith(allowed));
  }

  // Check referer as fallback
  if (referer) {
    return allowedOrigins.some((allowed) => referer.startsWith(allowed));
  }

  // No origin info - could be a direct API call or bot
  return false;
}

/**
 * Check for suspicious patterns in requests
 */
export function detectSuspiciousRequest(request: Request): {
  suspicious: boolean;
  reason?: string;
} {
  const userAgent = request.headers.get('user-agent') || '';

  // Check for empty or suspicious user agents
  if (!userAgent || userAgent.length < 10) {
    return { suspicious: true, reason: 'Missing or invalid user agent' };
  }

  // Check for common bot patterns (add more as needed)
  const botPatterns = [
    /curl/i,
    /wget/i,
    /python-requests/i,
    /scrapy/i,
    /bot(?!.*(?:google|bing|yahoo))/i, // Allow known search bots
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      return { suspicious: true, reason: `Bot-like user agent: ${userAgent}` };
    }
  }

  return { suspicious: false };
}
