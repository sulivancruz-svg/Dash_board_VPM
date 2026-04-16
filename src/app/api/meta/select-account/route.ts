import { NextRequest, NextResponse } from 'next/server';
import { prepareMetaToken } from '@/lib/meta-auth';
import { setMetaToken } from '@/lib/meta-token-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawToken = typeof body?.token === 'string' ? body.token.trim() : '';
    const accountId = typeof body?.accountId === 'string' ? body.accountId : '';
    const accountName = typeof body?.accountName === 'string' ? body.accountName : '';
    const userName = typeof body?.userName === 'string' ? body.userName : '';

    if (!rawToken || !accountId) {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
    }

    const prepared = await prepareMetaToken(rawToken);
    await setMetaToken(prepared.token, accountId, accountName || userName || accountId);

    return NextResponse.json({
      status: 'CONNECTED',
      accountId,
      accountName: accountName || userName || accountId,
      exchanged: prepared.exchanged,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar conta' },
      { status: 500 },
    );
  }
}
