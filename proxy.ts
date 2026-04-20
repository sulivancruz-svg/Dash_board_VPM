import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'dashboard_auth';

function getAuthToken() {
  return process.env.DASHBOARD_AUTH_TOKEN || '';
}

function isPublicPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    Boolean(pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/))
  );
}

function isAuthenticated(request: NextRequest) {
  const expectedToken = getAuthToken();
  const cookieToken = request.cookies.get(AUTH_COOKIE)?.value;

  return Boolean(expectedToken && cookieToken && cookieToken === expectedToken);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isAuthenticated(request)) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Acesso nao autorizado' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!.*\\.).*)', '/api/:path*'],
};
