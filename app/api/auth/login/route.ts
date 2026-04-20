import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'dashboard_auth';
const SESSION_MAX_AGE = 60 * 60 * 12;

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.DASHBOARD_PASSWORD;
  const authToken = process.env.DASHBOARD_AUTH_TOKEN;

  if (!configuredPassword || !authToken) {
    return NextResponse.json(
      { error: 'A senha do dashboard ainda nao foi configurada no ambiente.' },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;

  if (!body?.password || body.password !== configuredPassword) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: authToken,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
