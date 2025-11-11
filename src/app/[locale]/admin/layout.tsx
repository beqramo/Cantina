import { requireAuth } from '@/lib/auth-server';
import { headers } from 'next/headers';
import AdminClientLayout from './AdminClientLayout';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  let pathname = headersList.get('x-pathname') || '';

  // Fallback: try to get pathname from referer if header not set
  if (!pathname) {
    const referer = headersList.get('referer') || '';
    if (referer) {
      try {
        const url = new URL(referer);
        pathname = url.pathname;
        // Remove locale prefix if present
        if (pathname.startsWith('/en/') || pathname.startsWith('/pt/')) {
          pathname = pathname.replace(/^\/(en|pt)/, '');
        }
      } catch {
        // If URL parsing fails, use empty string
      }
    }
  }

  console.log('[Admin Layout] Server component rendered:', {
    pathname,
    pathnameFromHeader: headersList.get('x-pathname'),
    referer: headersList.get('referer'),
    allHeaders: Array.from(headersList.entries()).map(([key]) => key),
    timestamp: new Date().toISOString(),
  });

  // Allow access to login page without authentication
  // Check for both /admin/login and /[locale]/admin/login
  if (pathname === '/admin/login' || pathname.endsWith('/admin/login')) {
    console.log('[Admin Layout] Login page detected - skipping auth check');
    return <AdminClientLayout>{children}</AdminClientLayout>;
  }

  // For all other admin routes, verify authentication server-side
  // This will redirect to login if not authenticated
  console.log('[Admin Layout] Protected route - verifying authentication');
  await requireAuth();

  console.log('[Admin Layout] Authentication verified - rendering children');
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
