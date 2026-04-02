import { NextRequest, NextResponse } from 'next/server';
import { setMetaToken } from '@/lib/meta-token-store';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    // Validar token com Meta Graph API
    try {
      // Primeiro, obter dados do usuário
      const userResponse = await fetch('https://graph.facebook.com/v20.0/me?access_token=' + token, {
        method: 'GET',
      });

      if (!userResponse.ok) {
        return NextResponse.json(
          { error: 'Token inválido ou expirado' },
          { status: 401 }
        );
      }

      const userData = (await userResponse.json()) as any;
      const accountName = userData.name;

      // Agora, obter as contas de ads do usuário
      const accountsResponse = await fetch('https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name&access_token=' + token, {
        method: 'GET',
      });

      if (!accountsResponse.ok) {
        return NextResponse.json(
          { error: 'Token não tem acesso a contas de ads' },
          { status: 401 }
        );
      }

      const accountsData = (await accountsResponse.json()) as any;
      // Buscar contas com status
      const accountsWithStatus = await fetch(
        `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${token}`
      ).then(r => r.json()) as any;

      const allAccounts = (accountsWithStatus.data || accountsData.data || [])
        .filter((a: any) => a.account_status !== 2) // remover desabilitadas
        .map((a: any) => ({ id: a.id, name: a.name, status: a.account_status }));

      if (allAccounts.length === 0) {
        return NextResponse.json(
          { error: 'Nenhuma conta de ads ativa encontrada para este token' },
          { status: 400 }
        );
      }

      // Se há mais de 1 conta, retornar lista para o usuário escolher (sem salvar ainda)
      if (allAccounts.length > 1) {
        return NextResponse.json({
          status: 'SELECT_ACCOUNT',
          accounts: allAccounts,
          userName: accountName,
          message: 'Múltiplas contas encontradas. Selecione qual usar.',
        });
      }

      // Conta única: salvar direto
      const adAccount = allAccounts[0];
      setMetaToken(token, adAccount.id, accountName);

      return NextResponse.json({
        status: 'CONNECTED',
        accountId: adAccount.id,
        accountName,
        message: 'Token Meta validado e conectado com sucesso',
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Erro ao validar token com Meta API' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
