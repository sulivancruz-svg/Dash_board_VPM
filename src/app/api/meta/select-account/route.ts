import { NextRequest, NextResponse } from 'next/server';
import { setMetaToken } from '@/lib/meta-token-store';

export async function POST(req: NextRequest) {
  try {
    const { token, accountId, accountName, userName } = await req.json();
    if (!token || !accountId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    // Usar o nome da conta de anúncio (ex: "Vai Pro Mundo Anúncios"), não o nome do usuário
    await setMetaToken(token, accountId, accountName || userName);
    return NextResponse.json({
      status: 'CONNECTED',
      accountId,
      accountName: userName || accountName,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao salvar conta' }, { status: 500 });
  }
}
