import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // Disable automatic locale detection to prevent redirects based on cookies/headers
  localeDetection: false,
});

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[Middleware] Request received:', {
    pathname,
    method: request.method,
    url: request.url,
  });

  // Extract locale and path without locale
  let locale = 'en';
  let pathWithoutLocale = pathname;

  // Check if pathname starts with a locale
  for (const loc of locales) {
    if (pathname.startsWith(`/${loc}/`)) {
      locale = loc;
      pathWithoutLocale = pathname.replace(`/${loc}`, '');
      break;
    } else if (pathname === `/${loc}`) {
      locale = loc;
      pathWithoutLocale = '/';
      break;
    }
  }

  console.log('[Middleware] Locale extraction:', {
    detectedLocale: locale,
    pathWithoutLocale,
    originalPathname: pathname,
  });

  // Handle admin routes protection (with or without locale prefix)
  if (pathWithoutLocale.startsWith('/admin')) {
    console.log('[Middleware] Admin route detected:', {
      pathWithoutLocale,
      locale,
    });

    // Allow access to login page
    if (pathWithoutLocale === '/admin/login') {
      console.log('[Middleware] Login page - allowing access');
      const response = intlMiddleware(request);
      response.headers.set('x-pathname', pathWithoutLocale);
      return response;
    }

    // Check for auth token cookie
    // Full verification happens in server component layout
    const authTokenCookie = request.cookies.get('firebase-auth-token');
    const authToken = authTokenCookie?.value;

    console.log('[Middleware] Auth token check:', {
      cookieExists: !!authTokenCookie,
      tokenExists: !!authToken,
      tokenLength: authToken?.length || 0,
      tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : 'none',
      allCookies: Array.from(request.cookies.getAll()).map((c) => c.name),
    });

    // If no auth token, redirect to login (with locale if needed)
    if (!authToken) {
      const loginPath =
        locale === 'en' ? '/admin/login' : `/${locale}/admin/login`;
      console.log('[Middleware] No auth token found - redirecting to login:', {
        loginPath,
        reason: 'No firebase-auth-token cookie found',
      });
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      return NextResponse.redirect(url);
    }

    // Token exists, let server component verify it
    console.log('[Middleware] Auth token found - allowing request to proceed');
    const response = intlMiddleware(request);
    response.headers.set('x-pathname', pathWithoutLocale);
    return response;
  }

  // For all other routes, use the intl middleware
  console.log('[Middleware] Non-admin route - using intl middleware');
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
