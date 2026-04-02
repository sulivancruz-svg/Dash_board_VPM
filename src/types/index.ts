export type MetaIntegrationStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'INVALID' | 'DISCONNECTED';
export type ImportStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR' | 'PARTIAL';
export type DealStatus = 'WON' | 'LOST' | 'OPEN' | 'DELETED';
export type SdrLeadStatus = 'QUALIFIED' | 'DISQUALIFIED' | 'NO_CONTACT' | 'IN_PROGRESS' | 'UNKNOWN';
export type ChannelType = 'PAID_SOCIAL' | 'PAID_SEARCH' | 'ORGANIC_SEARCH' | 'ORGANIC_SOCIAL' | 'REFERRAL' | 'DIRECT' | 'EMAIL' | 'EVENT' | 'UNKNOWN';

export interface MetaIntegration {
  id: string;
  accountId: string | null;
  accountName: string | null;
  status: MetaIntegrationStatus;
  lastValidatedAt: Date | null;
  lastSyncedAt: Date | null;
}

export interface Dashboard {
  overview: DashboardOverview;
  metrics: DashboardMetrics;
}

export interface DashboardOverview {
  totalInvestment: number;
  leadsGenerated: number;
  leadsQualified: number;
  opportunities: number;
  salesClosed: number;
  totalRevenue: number;
  averageTicket: number;
  cac: number;
  periodLabel: string;
  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INSIGHT';
  message: string;
  action?: string;
}

export interface DashboardMetrics {
  channels: ChannelMetrics[];
  funnel: FunnelMetrics;
  periodo: PeriodComparison;
}

export interface ChannelMetrics {
  name: string;
  leads: number;
  qualified: number;
  qualificationRate: number;
  opportunities: number;
  dealsClosed: number;
  revenue: number;
  averageTicket: number;
  investment: number;
  cac: number;
  roi: number;
  volumeVsValueQuadrant: 'champion' | 'hiddenGem' | 'underperformer' | 'drain';
}

export interface FunnelMetrics {
  leadsGenerated: number;
  sdrReceived: number;
  sdrlQualified: number;
  opportunities: number;
  dealsClosed: number;
  conversionRates: {
    lead_to_qualified: number;
    qualified_to_opportunity: number;
    opportunity_to_closed: number;
  };
}

export interface PeriodComparison {
  current: {
    spend: number;
    leads: number;
    revenue: number;
    date: string;
  };
  previous: {
    spend: number;
    leads: number;
    revenue: number;
    date: string;
  };
  variance: {
    spend_pct: number;
    leads_pct: number;
    revenue_pct: number;
  };
}

export interface SdrImportData {
  summary: {
    month: string;
    year: number;
    leadsTotal: number;
    leadsQualified: number;
    dealsClosed: number;
  };
  deals: {
    clientName: string;
    channelRaw: string;
    monthEntered: string;
    monthClosed: string;
    monthTrip: string;
    dealValue: number;
  }[];
}

export interface PipedriveImportData {
  deals: {
    dealId: string;
    channelRaw: string;
    status: DealStatus;
    mondeDealId: string | null;
    revenue: number | null;
    hasMondeBilling: boolean;
  }[];
}
