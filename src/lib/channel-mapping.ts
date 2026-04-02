export type ChannelType = 'PAID_SOCIAL' | 'PAID_SEARCH' | 'ORGANIC_SEARCH' | 'ORGANIC_SOCIAL' | 'REFERRAL' | 'DIRECT' | 'EMAIL' | 'EVENT' | 'UNKNOWN';

/**
 * ChannelAttribution — classifica o canal pela ORIGEM do cliente:
 *  PAID_MEDIA          → investimento pago (Google, Meta/Social, Site) — base do ROI/CAC
 *  ORGANIC_COMMERCIAL  → esforço comercial sem investimento (Indicação, Networking, Prospecção)
 *  BRAND_BASE          → branding, recorrência ou origem ambígua (Espontaneamente, Pós-viagem)
 *  UNKNOWN             → não informado
 */
export type ChannelAttribution = 'PAID_MEDIA' | 'ORGANIC_COMMERCIAL' | 'BRAND_BASE' | 'UNKNOWN';

export const ATTRIBUTION_LABELS: Record<ChannelAttribution, string> = {
  PAID_MEDIA: 'Mídia Paga',
  ORGANIC_COMMERCIAL: 'Orgânico Comercial',
  BRAND_BASE: 'Branding / Base',
  UNKNOWN: 'Não Informado',
};

export const ATTRIBUTION_DESCRIPTIONS: Record<ChannelAttribution, string> = {
  PAID_MEDIA: 'Receita atribuída a Google Ads, Redes Sociais e Site — base do cálculo de ROI e CAC',
  ORGANIC_COMMERCIAL: 'Indicação, Networking e Prospecção Ativa — sem custo de mídia, excluído do ROI',
  BRAND_BASE: 'Espontâneo, recorrência e e-mail — origem ambígua (branding ou cliente fiel)',
  UNKNOWN: 'Canal não informado ou não mapeado',
};

export const ATTRIBUTION_COLORS: Record<ChannelAttribution, { badge: string; card: string; dot: string }> = {
  PAID_MEDIA:         { badge: 'bg-blue-100 text-blue-700',    card: 'border-blue-200 bg-blue-50',    dot: 'bg-blue-500' },
  ORGANIC_COMMERCIAL: { badge: 'bg-amber-100 text-amber-700',  card: 'border-amber-200 bg-amber-50',  dot: 'bg-amber-500' },
  BRAND_BASE:         { badge: 'bg-violet-100 text-violet-700',card: 'border-violet-200 bg-violet-50',dot: 'bg-violet-500' },
  UNKNOWN:            { badge: 'bg-slate-100 text-slate-500',  card: 'border-slate-200 bg-slate-50',  dot: 'bg-slate-400' },
};

/**
 * Classifica o canal bruto (nome exato da planilha Monde/Pipedrive) em categoria de atribuição.
 * Regra de negócio: apenas PAID_MEDIA entra no cálculo de ROI e CAC.
 */
export function attributeChannel(rawCanal: string): ChannelAttribution {
  if (!rawCanal) return 'UNKNOWN';

  // Mídia paga: Google, Redes Sociais / Facebook / Instagram / Meta Ads / Site
  if (/google|redes\s?sociais|facebook|instagram|meta\s*ads|site\b/i.test(rawCanal)) return 'PAID_MEDIA';

  // Orgânico Comercial: Indicação, Networking, Prospecção por Agente
  if (/indica[çc][aã]o|indicado|networking|relacionamento|prospec[çc][aã]o|agente/i.test(rawCanal)) return 'ORGANIC_COMMERCIAL';

  // Branding / Base: Espontaneamente, E-mail, Pós-Viagem, WhatsApp
  if (/espontaneamente|cliente.*vpm|vpm.*fez|p[oó]s[\s-]?viagem|formulári|e[\s-]?mail|whatsapp/i.test(rawCanal)) return 'BRAND_BASE';

  return 'UNKNOWN';
}

export interface ChannelNormalization {
  regex: RegExp;
  normalized: string;
  type: ChannelType;
}

export const CHANNEL_NORMALIZATION_RULES: ChannelNormalization[] = [
  // META — INSTAGRAM
  { regex: /instagram|ig[_\s]|insta/i, normalized: 'Meta - Instagram', type: 'PAID_SOCIAL' },
  // META — FACEBOOK
  { regex: /facebook|fb[_\s]|face\b/i, normalized: 'Meta - Facebook', type: 'PAID_SOCIAL' },
  // META — GERAL
  { regex: /meta[_\s]?ads|meta\b/i, normalized: 'Meta Ads', type: 'PAID_SOCIAL' },
  { regex: /redes\s?sociais|social\s?media/i, normalized: 'Meta - Instagram', type: 'PAID_SOCIAL' },

  // GOOGLE — PAID
  { regex: /google[_\s]?ads|adwords|google\s?ads|g?ads/i, normalized: 'Google Ads', type: 'PAID_SEARCH' },
  // GOOGLE — ORGANIC
  { regex: /google[_\s]?organic|seo/i, normalized: 'Organic Search', type: 'ORGANIC_SEARCH' },
  { regex: /^google$/i, normalized: 'Google Ads', type: 'PAID_SEARCH' },

  // ORGÂNICO / DIRETO
  { regex: /org[aâ]nico|organic\b/i, normalized: 'Orgânico', type: 'ORGANIC_SOCIAL' },
  { regex: /direto|direct\b|site\b|web\b/i, normalized: 'Direto / Site', type: 'DIRECT' },

  // INDICAÇÃO / REFERÊNCIA
  { regex: /indica[çc][aã]o|referral|referência|indicado/i, normalized: 'Indicação', type: 'REFERRAL' },
  { regex: /parceiro|partner/i, normalized: 'Parceiros', type: 'REFERRAL' },
  { regex: /cliente\s?vpm|cliente.*contato|espontaneamente/i, normalized: 'Clientes VPM - Retorno', type: 'ORGANIC_SOCIAL' },

  // EMAIL
  { regex: /e?mail[_\s]?marketing|newsletter/i, normalized: 'Email Marketing', type: 'EMAIL' },

  // EVENTOS
  { regex: /evento|event|workshop|fair/i, normalized: 'Eventos', type: 'EVENT' },

  // NETWORKING
  { regex: /networking|relacionamento|personal/i, normalized: 'Networking', type: 'REFERRAL' },

  // PROSPECÇÃO
  { regex: /prospec[çc][aã]o|prospect|agent/i, normalized: 'Prospecção Ativa', type: 'ORGANIC_SOCIAL' },

  // PASSANTE / LOJA
  { regex: /passante|loja\s?f[ií]sica/i, normalized: 'Loja Física', type: 'DIRECT' },

  // WHATSAPP / CHAT
  { regex: /whatsapp|whats|wa\b/i, normalized: 'WhatsApp', type: 'DIRECT' },
  { regex: /lista.*whats|lista do whats/i, normalized: 'WhatsApp', type: 'DIRECT' },

  // CAMPANHA ESPECÍFICA
  { regex: /campanha\s?chile/i, normalized: 'Campanha Chile', type: 'PAID_SOCIAL' },

  // PÓS-VENDA
  { regex: /p[óo]s[_\s]?viagem|pós-viagem|new.*booking/i, normalized: 'Pós-Viagem', type: 'ORGANIC_SOCIAL' },

  // INATIVO REATIVADO
  { regex: /inativo|vfb/i, normalized: 'Inativo Reativado', type: 'REFERRAL' },
];

export function normalizeChannel(rawName: string | null | undefined): string | null {
  if (!rawName) return null;

  const clean = String(rawName).trim();
  if (!clean) return null;

  for (const rule of CHANNEL_NORMALIZATION_RULES) {
    if (rule.regex.test(clean)) {
      return rule.normalized;
    }
  }

  return null; // unmapped
}

export function getChannelType(normalizedName: string | null): ChannelType {
  if (!normalizedName) return 'UNKNOWN';

  const rule = CHANNEL_NORMALIZATION_RULES.find(r => r.normalized === normalizedName);
  return rule?.type ?? 'UNKNOWN';
}

export const KNOWN_CHANNELS = [
  'Meta - Instagram',
  'Meta - Facebook',
  'Google Ads',
  'Organic Search',
  'Orgânico',
  'Direto / Site',
  'Indicação',
  'Parceiros',
  'Clientes VPM - Retorno',
  'Email Marketing',
  'Eventos',
  'Networking',
  'Prospecção Ativa',
  'Loja Física',
  'WhatsApp',
  'Campanha Chile',
  'Pós-Viagem',
  'Inativo Reativado',
];
