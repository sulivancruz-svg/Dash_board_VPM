const META_GRAPH_VERSION = 'v20.0';
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export interface MetaTokenDiagnostics {
  appId: string | null;
  application: string | null;
  dataAccessExpiresAt: number | null;
  expiresAt: number | null;
  isValid: boolean;
  scopes: string[];
  type: string | null;
  userId: string | null;
}

export interface PreparedMetaToken {
  diagnostics: MetaTokenDiagnostics | null;
  exchanged: boolean;
  token: string;
}

function getMetaAppCredentials(): { appId: string; appSecret: string } | null {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return null;
  }

  return { appId, appSecret };
}

function mapDebugTokenData(data: any): MetaTokenDiagnostics {
  return {
    appId: data?.app_id ?? null,
    application: data?.application ?? null,
    dataAccessExpiresAt: typeof data?.data_access_expires_at === 'number' ? data.data_access_expires_at : null,
    expiresAt: typeof data?.expires_at === 'number' && data.expires_at > 0 ? data.expires_at : null,
    isValid: Boolean(data?.is_valid),
    scopes: Array.isArray(data?.scopes) ? data.scopes : [],
    type: typeof data?.type === 'string' ? data.type : null,
    userId: typeof data?.user_id === 'string' ? data.user_id : null,
  };
}

export async function debugMetaToken(token: string): Promise<MetaTokenDiagnostics | null> {
  const creds = getMetaAppCredentials();

  if (!creds) {
    return null;
  }

  const url = new URL(`${META_GRAPH_BASE}/debug_token`);
  url.searchParams.set('input_token', token);
  url.searchParams.set('access_token', `${creds.appId}|${creds.appSecret}`);

  const response = await fetch(url.toString(), {
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Meta debug_token failed: ${response.status} ${detail}`);
  }

  const payload = await response.json() as { data?: any };
  return mapDebugTokenData(payload.data ?? {});
}

async function exchangeForLongLivedUserToken(token: string): Promise<string | null> {
  const creds = getMetaAppCredentials();

  if (!creds) {
    return null;
  }

  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', creds.appId);
  url.searchParams.set('client_secret', creds.appSecret);
  url.searchParams.set('fb_exchange_token', token);

  const response = await fetch(url.toString(), {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as { access_token?: string };
  return typeof payload.access_token === 'string' ? payload.access_token : null;
}

function shouldExchangeToken(diagnostics: MetaTokenDiagnostics | null): boolean {
  if (!getMetaAppCredentials()) {
    return false;
  }

  if (!diagnostics?.type) {
    return true;
  }

  return diagnostics.type.toUpperCase() === 'USER';
}

export async function prepareMetaToken(inputToken: string): Promise<PreparedMetaToken> {
  let token = inputToken.trim();
  let diagnostics: MetaTokenDiagnostics | null = null;
  let exchanged = false;

  try {
    diagnostics = await debugMetaToken(token);
  } catch {
    diagnostics = null;
  }

  if (diagnostics && !diagnostics.isValid) {
    throw new Error('Token invalido ou expirado');
  }

  if (shouldExchangeToken(diagnostics)) {
    let exchangedToken: string | null = null;

    try {
      exchangedToken = await exchangeForLongLivedUserToken(token);
    } catch {
      exchangedToken = null;
    }

    if (exchangedToken && exchangedToken !== token) {
      token = exchangedToken;
      exchanged = true;
      try {
        diagnostics = await debugMetaToken(token);
      } catch {
        diagnostics = null;
      }
    }
  }

  return {
    diagnostics,
    exchanged,
    token,
  };
}
