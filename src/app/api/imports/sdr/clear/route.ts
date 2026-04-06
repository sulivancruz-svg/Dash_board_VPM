import { NextResponse } from 'next/server';
import { kvDel } from '@/lib/storage';

export async function POST() {
  try {
    await kvDel('sdr-data');

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
