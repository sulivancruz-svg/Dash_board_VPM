import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  // Protege rotas /corporate/* com autenticação via NextAuth
  // Exclui login, api/auth, sync-manual (endpoint sem auth check), assets estáticos
  matcher: [
    '/((?!login|api/auth|api/corporate/sync-manual|_next/static|_next/image|favicon.ico|branding-assets).*)',
  ],
};
