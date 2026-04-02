import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const dataPath = path.join(process.cwd(), '.pipedrive-data.json');

    if (fs.existsSync(dataPath)) {
      fs.unlinkSync(dataPath);
    }

    return NextResponse.json({
      message: 'Dados do Pipedrive removidos com sucesso',
    });
  } catch (error) {
    console.error('Erro ao limpar Pipedrive:', error);
    return NextResponse.json(
      { error: 'Erro ao remover dados' },
      { status: 500 }
    );
  }
}
