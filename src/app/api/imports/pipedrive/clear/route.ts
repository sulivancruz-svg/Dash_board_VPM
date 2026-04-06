import { NextResponse } from 'next/server';
import { blobDel } from '@/lib/storage';

export async function POST() {
  try {
    await blobDel('pipedrive-data');

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
