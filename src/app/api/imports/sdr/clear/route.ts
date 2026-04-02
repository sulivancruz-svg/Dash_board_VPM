import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const dataPath = path.join(process.cwd(), '.sdr-data.json');

    if (fs.existsSync(dataPath)) {
      fs.unlinkSync(dataPath);
    }

    return NextResponse.json({
      message: 'Dados SDR removidos com sucesso',
    });
  } catch (error) {
    console.error('Erro ao limpar SDR:', error);
    return NextResponse.json(
      { error: 'Erro ao remover dados' },
      { status: 500 }
    );
  }
}
