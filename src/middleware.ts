import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const authSecret = process.env.NEXTAUTH_SECRET?.trim() || process.env.ENCRYPTION_KEY?.trim();

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    secret: authSecret,
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  // Protege todas as rotas exceto login e assets estáticos
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|branding-assets).*)',
  ],
};
