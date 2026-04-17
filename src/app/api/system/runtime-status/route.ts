import { NextResponse } from 'next/server';
import { getStorageStatus } from '@/lib/storage';

function getRuntimeStatus() {
  const storage = getStorageStatus();
  const hasNextAuthSecret = Boolean(process.env.NEXTAUTH_SECRET?.trim());
  const hasEncryptionKey = Boolean(process.env.ENCRYPTION_KEY?.trim());
  const hasDashboardPassword = Boolean(process.env.DASHBOARD_PASSWORD?.trim());

  const issues: Array<{ code: string; message: string; severity: 'error' | 'warning' }> = [];

  if (storage.runtime === 'vercel' && !storage.hasPersistentStorage) {
    issues.push({
      code: 'missing_persistent_storage',
      severity: 'error',
      message: 'A Vercel está sem Blob/KV conectado. Tokens, credenciais e configurações não persistem entre execuções.',
    });
  }

  if (!hasNextAuthSecret && !hasEncryptionKey) {
    issues.push({
      code: 'missing_auth_secret',
      severity: 'error',
      message: 'Defina NEXTAUTH_SECRET ou ENCRYPTION_KEY com um valor estável. Sem isso a sessão e a criptografia ficam instáveis.',
    });
  } else {
    if (!hasNextAuthSecret && hasEncryptionKey) {
      issues.push({
        code: 'nextauth_secret_fallback',
        severity: 'warning',
        message: 'NEXTAUTH_SECRET não está definido. O login está usando ENCRYPTION_KEY como fallback; defina NEXTAUTH_SECRET na Vercel.',
      });
    }

    if (!hasEncryptionKey && hasNextAuthSecret) {
      issues.push({
        code: 'encryption_key_fallback',
        severity: 'warning',
        message: 'ENCRYPTION_KEY não está definido. A criptografia dos tokens está derivando a chave de NEXTAUTH_SECRET; defina ENCRYPTION_KEY na Vercel.',
      });
    }
  }

  if (!hasDashboardPassword) {
    issues.push({
      code: 'missing_dashboard_password',
      severity: 'error',
      message: 'DASHBOARD_PASSWORD não está definido; o login por senha não vai funcionar corretamente.',
    });
  }

  return {
    auth: {
      hasDashboardPassword,
      hasEncryptionKey,
      hasNextAuthSecret,
      secretSource: hasNextAuthSecret ? 'NEXTAUTH_SECRET' : hasEncryptionKey ? 'ENCRYPTION_KEY' : null,
    },
    issues,
    storage,
  };
}

export async function GET() {
  return NextResponse.json(getRuntimeStatus());
}
