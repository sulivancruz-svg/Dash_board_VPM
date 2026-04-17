import { NextRequest, NextResponse } from 'next/server';
import {
  getGoogleAdsCredentials,
  setGoogleAdsCredentials,
  deleteGoogleAdsCredentials,
  type GoogleAdsCredentials,
} from '@/lib/google-ads-credentials-store';

/**
 * GET /api/google-ads/credentials
 * Retorna status da configuração (sem expor a chave privada)
 */
export async function GET() {
  try {
    const creds = await getGoogleAdsCredentials();
    if (!creds) {
      return NextResponse.json({ configured: false });
    }
    return NextResponse.json({
      configured: true,
      serviceAccountEmail: creds.serviceAccountEmail,
      customerId: creds.customerId,
      managerCustomerId: creds.managerCustomerId || null,
      hasPrivateKey: !!creds.privateKey,
      configuredAt: creds.configuredAt,
    });
  } catch {
    return NextResponse.json({ configured: false });
  }
}

/**
 * POST /api/google-ads/credentials
 * Salva credenciais da conta de serviço
 *
 * Body:
 * {
 *   "serviceAccountJson": "{ ... }",   // JSON key da conta de serviço GCP
 *   "developerToken": "...",            // Token de desenvolvedor da Google Ads API
 *   "customerId": "169-854-9372",       // ID da conta Google Ads
 *   "managerCustomerId": "..."          // Opcional: ID da conta gerenciadora (MCC)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceAccountJson, developerToken, customerId, managerCustomerId } = body;

    if (!developerToken?.trim()) {
      return NextResponse.json({ error: 'Developer Token é obrigatório' }, { status: 400 });
    }
    if (!customerId?.trim()) {
      return NextResponse.json({ error: 'Customer ID é obrigatório' }, { status: 400 });
    }
    if (!serviceAccountJson) {
      return NextResponse.json({ error: 'JSON da conta de serviço é obrigatório' }, { status: 400 });
    }

    let parsed: any;
    try {
      parsed = typeof serviceAccountJson === 'string'
        ? JSON.parse(serviceAccountJson)
        : serviceAccountJson;
    } catch {
      return NextResponse.json({ error: 'JSON da conta de serviço inválido' }, { status: 400 });
    }

    if (!parsed.private_key || !parsed.client_email) {
      return NextResponse.json({
        error: 'JSON inválido: deve conter "private_key" e "client_email"',
      }, { status: 400 });
    }

    const creds: GoogleAdsCredentials = {
      serviceAccountEmail: parsed.client_email,
      privateKey: parsed.private_key,
      privateKeyId: parsed.private_key_id || undefined,
      developerToken: developerToken.trim(),
      customerId: customerId.trim().replace(/-/g, ''),
      managerCustomerId: managerCustomerId?.trim().replace(/-/g, '') || undefined,
      configuredAt: new Date().toISOString(),
    };

    await setGoogleAdsCredentials(creds);

    return NextResponse.json({
      success: true,
      message: 'Credenciais salvas com sucesso',
      serviceAccountEmail: creds.serviceAccountEmail,
      customerId: creds.customerId,
    });
  } catch (error: any) {
    console.error('Erro ao salvar credenciais Google Ads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar credenciais' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/google-ads/credentials
 * Remove credenciais salvas
 */
export async function DELETE() {
  try {
    await deleteGoogleAdsCredentials();
    return NextResponse.json({ success: true, message: 'Credenciais removidas' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao remover credenciais' },
      { status: 500 },
    );
  }
}
