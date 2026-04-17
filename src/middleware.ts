import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const authSecret = process.env.NEXTAUTH_SECRET?.trim() || process.env.ENCRYPTION_KEY?.trim();

export default withAuth(
  function middleware(req) {
    if (req.nextauth.token) {
      return NextResponse.next();
    }

    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Sua sessão expirou. Entre novamente para continuar.', code: 'auth_required' },
        { status: 401 },
      );
    }

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  },
  {
    secret: authSecret,
    callbacks: {
      authorized: () => true,
    },
  },
);

export const config = {
  // Protege todas as rotas exceto login e assets estáticos
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|branding-assets).*)',
  ],
};
