import { adminAuth } from './firebase-admin';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { locales } from '@/i18n';

/**
 * Server-side function to verify Firebase ID token from cookies
 * Returns the user ID if token is valid, null otherwise
 */
export async function verifyAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('firebase-auth-token');
    const token = tokenCookie?.value;

    console.log('[Auth Server] Verifying auth token:', {
      cookieExists: !!tokenCookie,
      tokenExists: !!token,
      tokenLength: token?.length || 0,
      allCookies: Array.from(cookieStore.getAll()).map((c) => c.name),
    });

    if (!token) {
      console.log('[Auth Server] No token found in cookies');
      return null;
    }

    // Verify the token using Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log('[Auth Server] Token verified successfully:', {
      userId: decodedToken.uid,
      email: decodedToken.email,
    });
    return decodedToken.uid;
  } catch (error) {
    console.error('[Auth Server] Error verifying auth token:', error);
    return null;
  }
}

/**
 * Get current locale from headers/pathname
 */
function getLocaleFromPath(pathname: string): string {
  for (const loc of locales) {
    if (pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) {
      return loc;
    }
  }
  return 'en';
}

/**
 * Server-side function to protect admin routes
 * Redirects to login if not authenticated (with locale awareness)
 */
export async function requireAuth(): Promise<string> {
  console.log('[Auth Server] requireAuth called');
  const userId = await verifyAuthToken();

  if (!userId) {
    // Get locale from headers to redirect with correct locale
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';
    const referer = headersList.get('referer') || '';

    console.log('[Auth Server] No authenticated user - preparing redirect:', {
      pathname,
      referer,
    });

    // Try to extract locale from referer or pathname
    let locale = 'en';
    if (referer) {
      try {
        const url = new URL(referer);
        locale = getLocaleFromPath(url.pathname);
      } catch {
        // If URL parsing fails, use default
      }
    }

    const loginPath =
      locale === 'en' ? '/admin/login' : `/${locale}/admin/login`;
    console.log('[Auth Server] Redirecting to login:', { loginPath, locale });
    redirect(loginPath);
  }

  console.log('[Auth Server] User authenticated:', { userId });
  return userId;
}
