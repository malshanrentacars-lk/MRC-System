import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'cz_session';
const TOTP_COOKIE = 'cz_totp';
const PUBLIC_PATHS = ['/login', '/api/auth', '/setup-2fa', '/verify-2fa'];

function decodeBase64(value: string) {
  try {
    if (typeof atob === 'function') return atob(value);
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch { return null; }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for TOTP intermediate cookie (password verified, awaiting 2FA)
  const totpCookie = request.cookies.get(TOTP_COOKIE);
  if (totpCookie?.value) {
    const totpData = decodeBase64(totpCookie.value);
    if (totpData) {
      try {
        const parsed = JSON.parse(totpData);
        // User has verified password but needs to complete TOTP
        // Redirect to appropriate page
        if (parsed.id) {
          return NextResponse.next();
        }
      } catch { /* invalid, fall through */ }
    }
  }

  // Check session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate session
  try {
    const decoded = decodeBase64(sessionCookie.value);
    if (decoded) JSON.parse(decoded);
  } catch {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
};
