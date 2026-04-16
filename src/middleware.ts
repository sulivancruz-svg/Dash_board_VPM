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
  // Protege todas as rotas exceto login, assets estáticos e cron público.
  // `api/corporate/sync` fica fora porque é chamado pelo Vercel Cron sem sessão
  // (a autorização é feita no próprio handler via header Authorization Bearer).
  matcher: [
    '/((?!login|api/auth|api/corporate/sync|_next/static|_next/image|favicon.ico|branding-assets).*)',
  ],
};
