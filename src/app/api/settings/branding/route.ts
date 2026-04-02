import { NextRequest, NextResponse } from 'next/server';
import { getBrandingResponse, saveBrandingSettings } from '@/lib/branding-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(getBrandingResponse());
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const companyName = String(formData.get('companyName') || '').trim();
    const removeLogo = String(formData.get('removeLogo') || '') === 'true';
    const file = formData.get('logo');

    const logoFile = file instanceof File && file.size > 0 ? file : null;
    const logoBuffer = logoFile ? Buffer.from(await logoFile.arrayBuffer()) : null;

    const settings = saveBrandingSettings({
      companyName,
      logoBuffer,
      logoFileName: logoFile?.name || null,
      removeLogo,
    });

    return NextResponse.json({
      message: 'Identidade visual atualizada com sucesso',
      ...getBrandingResponse(),
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Branding settings error:', error);
    return NextResponse.json({ error: 'Erro ao salvar identidade visual' }, { status: 500 });
  }
}
