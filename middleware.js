import { NextResponse } from 'next/server';
import { getPublicBaseUrl } from '@/lib/caja-client';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/caja-redirect',
  '/api/auth/caja-callback',
  '/api/auth/caja-verify',
  '/api/auth/caja-link',
  '/auth/link-account',
];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((route) => pathname === route || (route !== '/' && pathname.startsWith(`${route}/`)))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Libera rotas de API do painel administrativo para compatibilidade com sessões locais existentes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/', getPublicBaseUrl(request)));
  }

  let parsed = null;
  try {
    parsed = JSON.parse(sessionCookie);
  } catch (_) {
    try {
      parsed = JSON.parse(decodeURIComponent(sessionCookie));
    } catch (_) {}
  }

  if (!parsed || (!parsed.email && !parsed.id)) {
    return NextResponse.redirect(new URL('/', getPublicBaseUrl(request)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
