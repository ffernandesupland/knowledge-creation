import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public routes that don't require authentication
  // All /api/* routes are exempt — they use Bearer tokens internally, not cookies
  if (path.startsWith('/login') || path.startsWith('/api/') || path.startsWith('/_next') || path.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Check for the auth cookie
  const authCookie = request.cookies.get('ai_kb_auth')?.value;
  const validPassword = process.env.APP_PASSWORD;

  // Protect the app if APP_PASSWORD is set in the environment
  if (validPassword && validPassword.trim() !== '') {
    if (!authCookie || authCookie !== validPassword) {
      // Redirect to login page if unauthorized
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
