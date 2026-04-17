import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // Enable locale detection to use browser's Accept-Language header
  localeDetection: true,
});

// Helper function to detect preferred locale
// Priority: 1. User's saved preference (NEXT_LOCALE cookie), 2. Browser's Accept-Language header
function getPreferredLocale(request: NextRequest): string {
  // First, check for user's saved language preference (set when user manually switches)
  const savedLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (
    savedLocale &&
    locales.includes(savedLocale as (typeof locales)[number])
  ) {
    return savedLocale;
  }

  // Fall back to browser's Accept-Language header (only for first-time visitors)
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return 'en';

  // Parse Accept-Language header (e.g., "pt-BR,pt;q=0.9,en;q=0.8")
  const languages = acceptLanguage.split(',').map((lang) => {
    const [code, qValue] = lang.trim().split(';q=');
    return {
      code: code.split('-')[0].toLowerCase(), // Get primary language code
      q: qValue ? parseFloat(qValue) : 1.0,
    };
  });

  // Sort by quality value (highest first)
  languages.sort((a, b) => b.q - a.q);

  // Find the first language that matches our supported locales
  for (const lang of languages) {
    if (locales.includes(lang.code as (typeof locales)[number])) {
      return lang.code;
    }
  }

  return 'en';
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract locale from URL path
  let urlLocale: string | null = null;
  let pathWithoutLocale = pathname;

  // Check if pathname starts with a locale
  for (const loc of locales) {
    if (pathname.startsWith(`/${loc}/`)) {
      urlLocale = loc;
      pathWithoutLocale = pathname.replace(`/${loc}`, '');
      break;
    } else if (pathname === `/${loc}`) {
      urlLocale = loc;
      pathWithoutLocale = '/';
      break;
    }
  }

  // Determine locale: use URL locale, or detect from browser
  const locale = urlLocale || getPreferredLocale(request);

  // Handle admin routes protection (with or without locale prefix)
  if (pathWithoutLocale.startsWith('/admin')) {
    // Allow access to login page
    if (pathWithoutLocale === '/admin/login') {
      const response = intlMiddleware(request);
      response.headers.set('x-pathname', pathWithoutLocale);
      return response;
    }

    // Check for auth token cookie
    // Full verification happens in server component layout
    const authToken = request.cookies.get('firebase-auth-token')?.value;

    // If no auth token, redirect to login (with locale if needed)
    if (!authToken) {
      const loginPath =
        locale === 'en' ? '/admin/login' : `/${locale}/admin/login`;
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      return NextResponse.redirect(url);
    }

    // Token exists, let server component verify it
    const response = intlMiddleware(request);
    response.headers.set('x-pathname', pathWithoutLocale);
    return response;
  }

  // For all other routes, use the intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except:
    // - api routes
    // - _next (Next.js internals)
    // - _vercel (Vercel internals)
    // - static files (files with extensions)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
