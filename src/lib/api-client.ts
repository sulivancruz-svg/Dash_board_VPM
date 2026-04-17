'use client';

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status = 500, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.code === 'auth_required';
  }
}

function parseJsonSafely(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function fetchApiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  const data = parseJsonSafely(text) as Record<string, unknown> | null;

  if (!response.ok) {
    const message = typeof data?.error === 'string'
      ? data.error
      : response.status === 401
        ? 'Sua sessão expirou. Entre novamente para continuar.'
        : 'Erro ao carregar dados do dashboard.';
    const code = typeof data?.code === 'string' ? data.code : null;
    throw new ApiError(message, response.status, code);
  }

  if (!contentType.includes('application/json')) {
    throw new ApiError('A API retornou uma resposta inválida. Recarregue a página e faça login novamente.', response.status || 500);
  }

  if (data === null) {
    throw new ApiError('A API retornou uma resposta vazia.', response.status || 500);
  }

  return data as T;
}
