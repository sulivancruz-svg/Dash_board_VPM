import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Senha',
      credentials: {
        password: { label: 'Senha de acesso', type: 'password' },
      },
      async authorize(credentials) {
        const correctPassword = process.env.DASHBOARD_PASSWORD;
        if (!correctPassword) {
          console.error('[auth] DASHBOARD_PASSWORD nao configurado');
          return null;
        }
        if (credentials?.password === correctPassword) {
          // Retorna um "usuário" genérico — dashboard é multiusuário com senha única
          return { id: '1', name: 'Socio', email: 'dashboard@interno' };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
