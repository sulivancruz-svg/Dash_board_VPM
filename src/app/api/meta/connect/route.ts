import { NextRequest, NextResponse } from 'next/server';
import { debugMetaToken, prepareMetaToken } from '@/lib/meta-auth';
import { getMetaToken, setMetaToken } from '@/lib/meta-token-store';

export async function GET() {
  const token = await getMetaToken();

  if (!token) {
    return NextResponse.json({ connected: false });
  }

  try {
    const diagnostics = await debugMetaToken(token.token);

    if (diagnostics) {
      if (!diagnostics.isValid) {
        return NextResponse.json({
          connected: false,
          expired: true,
          accountId: token.accountId,
          accountName: token.accountName,
        });
      }

      const expiresSoon = diagnostics.expiresAt
        ? diagnostics.expiresAt * 1000 < Date.now() + 3 * 24 * 60 * 60 * 1000
        : false;

      return NextResponse.json({
        connected: true,
        accountId: token.accountId,
        accountName: token.accountName,
        expiresAt: diagnostics.expiresAt,
        expiresSoon,
        tokenType: diagnostics.type,
      });
    }

    const response = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token.token}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({
        connected: false,
        expired: true,
        accountId: token.accountId,
        accountName: token.accountName,
      });
    }
  } catch {
    // In case of a transient network failure, keep the UI connected.
  }

  return NextResponse.json({
    connected: true,
    accountId: token.accountId,
    accountName: token.accountName,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawToken = typeof body?.token === 'string' ? body.token.trim() : '';

    if (!rawToken) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 400 });
    }

    try {
      const prepared = await prepareMetaToken(rawToken);
      const token = prepared.token;

      const userResponse = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!userResponse.ok) {
        return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 });
      }

      const userData = await userResponse.json() as { name?: string };
      const userName = userData.name ?? 'Meta Ads';

      const accountsResponse = await fetch(
        `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name&access_token=${token}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      if (!accountsResponse.ok) {
        return NextResponse.json({ error: 'Token nao tem acesso a contas de ads' }, { status: 401 });
      }

      const accountsData = await accountsResponse.json() as { data?: Array<{ account_status?: number; id: string; name: string }> };
      const accountsWithStatus = await fetch(
        `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${token}`,
        { cache: 'no-store' },
      ).then(async response => await response.json()) as {
        data?: Array<{ account_status?: number; id: string; name: string }>;
      };

      const accounts = (accountsWithStatus.data || accountsData.data || []) as Array<{
        account_status?: number;
        id: string;
        name: string;
      }>;

      const allAccounts = accounts
        .filter(account => account.account_status !== 2)
        .map(account => ({
          id: account.id,
          name: account.name,
          status: account.account_status ?? 1,
        }));

      if (allAccounts.length === 0) {
        return NextResponse.json(
          { error: 'Nenhuma conta de ads ativa encontrada para este token' },
          { status: 400 },
        );
      }

      if (allAccounts.length > 1) {
        return NextResponse.json({
          status: 'SELECT_ACCOUNT',
          accounts: allAccounts,
          exchanged: prepared.exchanged,
          userName,
          message: 'Multiplas contas encontradas. Selecione qual usar.',
        });
      }

      const adAccount = allAccounts[0];
      await setMetaToken(token, adAccount.id, adAccount.name || userName);

      return NextResponse.json({
        status: 'CONNECTED',
        accountId: adAccount.id,
        accountName: adAccount.name || userName,
        exchanged: prepared.exchanged,
        message: prepared.exchanged
          ? 'Token convertido para longa duracao e conectado com sucesso'
          : 'Token Meta validado e conectado com sucesso',
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Erro ao validar token com Meta API' },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Erro ao processar requisicao' }, { status: 500 });
  }
}
