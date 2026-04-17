export interface CorporateSale {
  id: string;
  date: Date;
  sellerId: string;
  client: string;
  product: string;
  amount: number;
  commission: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  sheetId?: string;
  sheetRowId?: number;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateSalesSnapshot {
  id: string;
  date: Date;
  totalSales: number;
  totalClients: number;
  totalProducts: number;
  avgTicket: number;
  topSeller?: string;
  topClient?: string;
  topProduct?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OverviewData {
  totalSales: number;
  totalRevenue: number;
  totalClients: number;
  totalProducts: number;
  avgTicket: number;
  growthRate: number;
  topSellerName: string;
  topSellerAmount: number;
  topClientName: string;
  topClientAmount: number;
  topProductName: string;
  topProductAmount: number;
  salesTrend: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

export interface SellersData {
  id: string;
  name: string;
  totalSales: number;
  totalRevenue: number;
  commission: number;
  avgTicket: number;
  status: string;
  lastSaleDate: Date;
  salesCount: number;
}

export interface ClientsData {
  id: string;
  name: string;
  totalPurchases: number;
  totalSpent: number;
  avgTicket: number;
  lastPurchaseDate: Date;
  productsCount: number;
  status: string;
}

export interface ProductsData {
  id: string;
  name: string;
  totalSales: number;
  totalRevenue: number;
  avgPrice: number;
  lastSaleDate: Date;
  unitsSold: number;
  status: string;
}

export interface BehavioralData {
  date: string;
  hour: number;
  salesCount: number;
  revenue: number;
  avgTicket: number;
}

export interface ComparisonData {
  period: string;
  previousPeriod: {
    totalSales: number;
    totalRevenue: number;
    avgTicket: number;
  };
  currentPeriod: {
    totalSales: number;
    totalRevenue: number;
    avgTicket: number;
  };
  growth: {
    salesGrowth: number;
    revenueGrowth: number;
    avgTicketGrowth: number;
  };
}

export interface RawSaleData extends CorporateSale {
  sellerName: string;
}
