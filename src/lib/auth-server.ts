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
    const token = cookieStore.get('firebase-auth-token')?.value;

    if (!token) {
      return null;
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
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
  const userId = await verifyAuthToken();

  if (!userId) {
    const headersList = await headers();
    const referer = headersList.get('referer') || '';

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
    redirect(loginPath);
  }

  return userId;
}
