# Corporate Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a completely separate corporate sales analytics dashboard powered by Google Sheets data, with daily sync, historical snapshots, and new chart types.

**Architecture:** 
- Isolated `/corporate` route with separate authentication context
- Google Sheets API syncs data every 24h into `corporate_sales` + `corporate_sales_history` tables
- 8 API endpoints aggregate sales data by sellers, clients, products, behavior
- 5 new chart components (Line Multi-Series, Stacked Bar, Horizontal Bar, Scatter, Heatmap)
- 7 dashboard pages: Overview, Sellers, Clients, Products, Behavioral, Comparison, Raw Data

**Tech Stack:** Next.js 14, TypeScript, React, Tailwind, Recharts, Prisma, BullMQ, Google Sheets API

**Databases:** 
- `corporate_sales` - current state (schema based on Sheets: venda_nº, data_venda, vendedor, pagante, produto, fornecedor, data_inicio, data_fim, destino, tipo_pessoa, situacao, receitas, faturamento)
- `corporate_sales_history` - daily snapshots for trend analysis
- `corporate_sync_log` - track sync operations

---

## Task 1: Database Schema & Migrations

**Files:**
- Create: `prisma/migrations/[timestamp]_add_corporate_tables/migration.sql`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Create migration file for corporate tables**

```sql
-- Create corporate_sales table
CREATE TABLE corporate_sales (
  id SERIAL PRIMARY KEY,
  venda_numero INT NOT NULL UNIQUE,
  data_venda DATE NOT NULL,
  vendedor VARCHAR(255) NOT NULL,
  cliente_original VARCHAR(255),
  cliente_grupo VARCHAR(255),
  produto VARCHAR(100) NOT NULL,
  fornecedor VARCHAR(255),
  data_inicio DATE,
  data_fim DATE,
  destino VARCHAR(255),
  tipo_pessoa VARCHAR(50),
  situacao VARCHAR(50),
  receitas DECIMAL(12,2) NOT NULL,
  faturamento DECIMAL(12,2) NOT NULL,
  antecedencia_dias INT,
  perfil_cliente VARCHAR(50),
  sync_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendedor (vendedor),
  INDEX idx_cliente (cliente_grupo),
  INDEX idx_produto (produto),
  INDEX idx_data_venda (data_venda),
  INDEX idx_sync_id (sync_id)
);

-- Create corporate_sales_history table for snapshots
CREATE TABLE corporate_sales_history (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  vendedor VARCHAR(255),
  cliente_grupo VARCHAR(255),
  produto VARCHAR(100),
  total_receitas DECIMAL(12,2),
  total_faturamento DECIMAL(12,2),
  quantidade_vendas INT,
  ticket_medio DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_snapshot_date (snapshot_date),
  INDEX idx_vendedor (vendedor),
  UNIQUE KEY uk_snapshot (snapshot_date, vendedor, cliente_grupo, produto)
);

-- Create sync log table
CREATE TABLE corporate_sync_log (
  id SERIAL PRIMARY KEY,
  sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  records_imported INT,
  error_message TEXT,
  sync_duration_ms INT
);
```

- [ ] **Step 2: Update Prisma schema.prisma**

Add to `prisma/schema.prisma`:

```prisma
model CorporateSales {
  id                Int      @id @default(autoincrement())
  vendaNumeroe      Int      @unique
  dataVenda         DateTime @db.Date
  vendedor          String
  clienteOriginal   String?
  clienteGrupo      String?
  produto           String
  fornecedor        String?
  dataInicio        DateTime? @db.Date
  dataFim           DateTime? @db.Date
  destino           String?
  tipoPessoa        String?
  situacao          String?
  receitas          Decimal  @db.Decimal(12, 2)
  faturamento       Decimal  @db.Decimal(12, 2)
  antecedenciaDias  Int?
  perfilCliente     String?
  syncId            String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([vendedor])
  @@index([clienteGrupo])
  @@index([produto])
  @@index([dataVenda])
  @@index([syncId])
}

model CorporateSalesHistory {
  id                   Int      @id @default(autoincrement())
  snapshotDate         DateTime @db.Date
  vendedor             String?
  clienteGrupo         String?
  produto              String?
  totalReceitas        Decimal? @db.Decimal(12, 2)
  totalFaturamento     Decimal? @db.Decimal(12, 2)
  quantidadeVendas     Int?
  ticketMedio          Decimal? @db.Decimal(12, 2)
  createdAt            DateTime @default(now())

  @@unique([snapshotDate, vendedor, clienteGrupo, produto])
  @@index([snapshotDate])
}

model CorporateSyncLog {
  id                Int      @id @default(autoincrement())
  syncDate          DateTime @default(now())
  status            String
  recordsImported   Int?
  errorMessage      String?
  syncDurationMs    Int?
}
```

- [ ] **Step 3: Run migration**

```bash
cd dashboard
npx prisma migrate dev --name add_corporate_tables
```

Expected: Migration applied successfully, schema updated.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations prisma/schema.prisma
git commit -m "feat: add corporate sales database schema with history and sync logs"
```

---

## Task 2: Google Sheets API Integration

**Files:**
- Create: `src/lib/corporate/google-sheets.ts`
- Create: `src/lib/corporate/corporate-db.ts`

- [ ] **Step 1: Create Google Sheets sync function**

```typescript
// src/lib/corporate/google-sheets.ts
import { google } from 'googleapis';
import { Readable } from 'stream';

const sheets = google.sheets('v4');

interface CorporateSalesRow {
  vendaNumeroe: number;
  dataVenda: Date;
  vendedor: string;
  clienteOriginal: string;
  clienteGrupo: string;
  produto: string;
  fornecedor: string;
  dataInicio: Date;
  dataFim: Date;
  destino: string;
  tipoPessoa: string;
  situacao: string;
  receitas: number;
  faturamento: number;
  antecedenciaDias: number;
  perfilCliente: string;
}

export async function fetchGoogleSheetsData(): Promise<CorporateSalesRow[]> {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '1IGELGbij2xDKWvKpX_qnIlCE_PK9Uxf1fctr73Y2JOk';

  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: 'Vendas!A2:N1000', // Adjust range based on actual sheet
  });

  const rows = response.data.values || [];
  return rows.map((row: any[]) => ({
    vendaNumeroe: parseInt(row[0]),
    dataVenda: new Date(row[1]),
    vendedor: row[2],
    clienteOriginal: row[3],
    clienteGrupo: row[4] || row[3],
    produto: row[5],
    fornecedor: row[6],
    dataInicio: new Date(row[7]),
    dataFim: new Date(row[8]),
    destino: row[9],
    tipoPessoa: row[10],
    situacao: row[11],
    receitas: parseFloat(row[12]),
    faturamento: parseFloat(row[13]),
    antecedenciaDias: calculateAntecedencia(new Date(row[1]), new Date(row[7])),
    perfilCliente: classifyProfile(calculateAntecedencia(new Date(row[1]), new Date(row[7]))),
  }));
}

function calculateAntecedencia(datavenda: Date, dataInicio: Date): number {
  const diffTime = dataInicio.getTime() - datavenda.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function classifyProfile(dias: number): string {
  if (dias <= 7) return 'Urgente';
  if (dias <= 30) return 'Normal';
  return 'Planejado';
}

export async function syncCorporateSales(prisma: any) {
  const syncId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const data = await fetchGoogleSheetsData();
    
    // Delete existing data
    await prisma.corporateSales.deleteMany({});
    
    // Insert new data
    const result = await prisma.corporateSales.createMany({
      data: data.map(row => ({ ...row, syncId })),
    });

    // Create snapshot for history
    const snapshot = await createHistorySnapshot(prisma);

    // Log sync
    await prisma.corporateSyncLog.create({
      data: {
        status: 'SUCCESS',
        recordsImported: result.count,
        syncDurationMs: Date.now() - startTime,
      },
    });

    return { success: true, recordsImported: result.count };
  } catch (error) {
    await prisma.corporateSyncLog.create({
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message,
        syncDurationMs: Date.now() - startTime,
      },
    });
    throw error;
  }
}

async function createHistorySnapshot(prisma: any) {
  const today = new Date().toISOString().split('T')[0];
  
  const summaries = await prisma.corporateSales.groupBy({
    by: ['vendedor', 'clienteGrupo', 'produto'],
    _sum: { receitas: true, faturamento: true },
    _count: true,
  });

  return prisma.corporateSalesHistory.createMany({
    data: summaries.map((s: any) => ({
      snapshotDate: new Date(today),
      vendedor: s.vendedor,
      clienteGrupo: s.clienteGrupo,
      produto: s.produto,
      totalReceitas: s._sum.receitas,
      totalFaturamento: s._sum.faturamento,
      quantidadeVendas: s._count,
      ticketMedio: s._sum.receitas / s._count,
    })),
    skipDuplicates: true,
  });
}
```

- [ ] **Step 2: Create database query helpers**

```typescript
// src/lib/corporate/corporate-db.ts
import { Prisma } from '@prisma/client';

export async function getOverviewMetrics(prisma: any, dateRange?: { from: Date; to: Date }) {
  const where: Prisma.CorporateSalesWhereInput = dateRange
    ? { dataVenda: { gte: dateRange.from, lte: dateRange.to } }
    : {};

  const [sales, totalReceita, totalFaturamento, vendedoresCount] = await Promise.all([
    prisma.corporateSales.count({ where }),
    prisma.corporateSales.aggregate({
      where,
      _sum: { receitas: true },
    }),
    prisma.corporateSales.aggregate({
      where,
      _sum: { faturamento: true },
    }),
    prisma.corporateSales.findMany({
      where,
      distinct: ['vendedor'],
      select: { vendedor: true },
    }),
  ]);

  return {
    totalVendas: sales,
    totalReceita: totalReceita._sum.receitas || 0,
    totalFaturamento: totalFaturamento._sum.faturamento || 0,
    ticketMedio: (totalFaturamento._sum.faturamento || 0) / sales,
    vendedoresAtivos: vendedoresCount.length,
    crescimento: await calculateGrowth(prisma),
  };
}

export async function getSellerPerformance(prisma: any) {
  return prisma.corporateSales.groupBy({
    by: ['vendedor'],
    _sum: { receitas: true, faturamento: true },
    _count: true,
    orderBy: { _sum: { receitas: 'desc' } },
  });
}

export async function getClientAnalysis(prisma: any) {
  return prisma.corporateSales.groupBy({
    by: ['clienteGrupo'],
    _sum: { receitas: true, faturamento: true },
    _count: true,
    orderBy: { _sum: { receitas: 'desc' } },
  });
}

export async function getProductBreakdown(prisma: any) {
  return prisma.corporateSales.groupBy({
    by: ['produto'],
    _sum: { receitas: true, faturamento: true },
    _count: true,
    orderBy: { _sum: { receitas: 'desc' } },
  });
}

export async function getBehavioralAnalysis(prisma: any) {
  const byProfile = await prisma.corporateSales.groupBy({
    by: ['perfilCliente'],
    _count: true,
    _sum: { receitas: true },
  });

  const byAntecedencia = await prisma.corporateSales.findMany({
    select: { antecedenciaDias: true, receitas: true },
    orderBy: { antecedenciaDias: 'asc' },
  });

  return { byProfile, byAntecedencia };
}

export async function getComparison(prisma: any) {
  // Compare last 30 days vs previous 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

  const period1 = await getOverviewMetrics(prisma, { from: sixtyDaysAgo, to: thirtyDaysAgo });
  const period2 = await getOverviewMetrics(prisma, { from: thirtyDaysAgo, to: today });

  return {
    period1,
    period2,
    growth: {
      receita: ((period2.totalReceita - period1.totalReceita) / period1.totalReceita) * 100,
      vendas: ((period2.totalVendas - period1.totalVendas) / period1.totalVendas) * 100,
    },
  };
}

async function calculateGrowth(prisma: any) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const current = await prisma.corporateSales.aggregate({
    where: { dataVenda: { gte: lastMonth } },
    _sum: { receitas: true },
  });

  const previous = await prisma.corporateSales.aggregate({
    where: { dataVenda: { lt: lastMonth } },
    _sum: { receitas: true },
  });

  const curr = current._sum.receitas || 0;
  const prev = previous._sum.receitas || 0;
  return prev === 0 ? 100 : ((curr - prev) / prev) * 100;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/corporate/google-sheets.ts src/lib/corporate/corporate-db.ts
git commit -m "feat: add Google Sheets API sync and database query helpers"
```

---

## Task 3: API Endpoints for Corporate Data

**Files:**
- Create: `src/app/api/corporate/sync/route.ts`
- Create: `src/app/api/corporate/overview/route.ts`
- Create: `src/app/api/corporate/sellers/route.ts`
- Create: `src/app/api/corporate/clients/route.ts`
- Create: `src/app/api/corporate/products/route.ts`
- Create: `src/app/api/corporate/behavioral/route.ts`
- Create: `src/app/api/corporate/comparison/route.ts`
- Create: `src/app/api/corporate/raw-data/route.ts`

- [ ] **Step 1: Create sync endpoint**

```typescript
// src/app/api/corporate/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncCorporateSales } from '@/lib/corporate/google-sheets';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncCorporateSales(prisma);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create overview endpoint**

```typescript
// src/app/api/corporate/overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOverviewMetrics } from '@/lib/corporate/corporate-db';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metrics = await getOverviewMetrics(prisma);
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create sellers endpoint**

```typescript
// src/app/api/corporate/sellers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSellerPerformance } from '@/lib/corporate/corporate-db';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sellers = await getSellerPerformance(prisma);
    return NextResponse.json(sellers);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Create clients endpoint**

```typescript
// src/app/api/corporate/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClientAnalysis } from '@/lib/corporate/corporate-db';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clients = await getClientAnalysis(prisma);
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Create products endpoint**

```typescript
// src/app/api/corporate/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProductBreakdown } from '@/lib/corporate/corporate-db';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await getProductBreakdown(prisma);
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 6: Create behavioral endpoint**

```typescript
// src/app/api/corporate/behavioral/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBehavioralAnalysis } from '@/lib/corporate/corporate-db';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const analysis = await getBehavioralAnalysis(prisma);
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 7: Create comparison endpoint**

```typescript
// src/app/api/corporate/comparison/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getComparison } from '@/lib/corporate/corporate-db';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const comparison = await getComparison(prisma);
    return NextResponse.json(comparison);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 8: Create raw-data endpoint**

```typescript
// src/app/api/corporate/raw-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  try {
    const [data, total] = await Promise.all([
      prisma.corporateSales.findMany({
        skip,
        take: limit,
        orderBy: { dataVenda: 'desc' },
      }),
      prisma.corporateSales.count(),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/corporate/
git commit -m "feat: add 8 API endpoints for corporate data aggregation"
```

---

## Task 4: New Chart Components (5 types)

**Files:**
- Create: `src/components/corporate/metric-card.tsx`
- Create: `src/components/corporate/line-chart-multi-series.tsx`
- Create: `src/components/corporate/stacked-bar-chart.tsx`
- Create: `src/components/corporate/horizontal-bar-chart.tsx`
- Create: `src/components/corporate/scatter-chart.tsx`

- [ ] **Step 1: Create MetricCard component**

```typescript
// src/components/corporate/metric-card.tsx
'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number | string;
  change?: number;
  format?: 'currency' | 'number' | 'percent';
  icon?: React.ReactNode;
}

function formatValue(value: number, format?: string): string {
  if (typeof value === 'string') return value;
  
  if (format === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  if (format === 'percent') {
    return `${value.toFixed(1)}%`;
  }
  
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function MetricCard({ label, value, change, format, icon }: MetricCardProps) {
  const isPositive = change && change > 0;
  
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatValue(value as number, format)}
          </p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create LineChartMultiSeries component**

```typescript
// src/components/corporate/line-chart-multi-series.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineChartMultiSeriesProps {
  data: Array<Record<string, any>>;
  xKey: string;
  lines: Array<{ key: string; name: string; color: string }>;
  title?: string;
}

export function LineChartMultiSeries({ data, xKey, lines, title }: LineChartMultiSeriesProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip 
            formatter={(value: any) => new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(value)}
          />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create StackedBarChart component**

```typescript
// src/components/corporate/stacked-bar-chart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StackedBarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  bars: Array<{ key: string; name: string; fill: string }>;
  title?: string;
}

export function StackedBarChart({ data, xKey, bars, title }: StackedBarChartProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip 
            formatter={(value: any) => new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(value)}
          />
          <Legend />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.fill} stackId="a" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create HorizontalBarChart component**

```typescript
// src/components/corporate/horizontal-bar-chart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HorizontalBarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  title?: string;
}

export function HorizontalBarChart({ data, xKey, yKey, title }: HorizontalBarChartProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey={yKey} type="category" width={180} />
          <Tooltip 
            formatter={(value: any) => new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(value)}
          />
          <Bar dataKey={xKey} fill="#3b82f6" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Create ScatterChart component (Antecedência vs Receita)**

```typescript
// src/components/corporate/scatter-chart.tsx
'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ScatterChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

export function ScatterChartComp({ data, xKey, yKey, title, xLabel, yLabel }: ScatterChartProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} name={xLabel || xKey} />
          <YAxis dataKey={yKey} name={yLabel || yKey} />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: any) => typeof value === 'number' 
              ? new Intl.NumberFormat('pt-BR').format(value)
              : value
            }
          />
          <Legend />
          <Scatter
            name="Vendas"
            data={data}
            fill="#8884d8"
            fillOpacity={0.7}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/corporate/
git commit -m "feat: add 5 new chart components for corporate dashboard"
```

---

## Task 5: Corporate Dashboard Layout & Navigation

**Files:**
- Create: `src/app/corporate/layout.tsx`
- Create: `src/components/corporate/sidebar.tsx`

- [ ] **Step 1: Create corporate layout with sidebar**

```typescript
// src/app/corporate/layout.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { CorporateSidebar } from '@/components/corporate/sidebar';

export const metadata = {
  title: 'Corporate Dashboard - Minha Viagem',
  description: 'Sales analytics for travel agency',
};

export default async function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <CorporateSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create sidebar navigation**

```typescript
// src/components/corporate/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Store,
  ShoppingCart,
  TrendingUp,
  GitCompare,
  Table,
} from 'lucide-react';

const navItems = [
  { href: '/corporate', label: 'Overview', icon: BarChart3 },
  { href: '/corporate/sellers', label: 'Sellers', icon: Users },
  { href: '/corporate/clients', label: 'Clients', icon: Store },
  { href: '/corporate/products', label: 'Products', icon: ShoppingCart },
  { href: '/corporate/behavioral', label: 'Behavioral', icon: TrendingUp },
  { href: '/corporate/comparison', label: 'Comparison', icon: GitCompare },
  { href: '/corporate/raw-data', label: 'Raw Data', icon: Table },
];

export function CorporateSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white shadow-lg">
      <div className="p-6">
        <h1 className="text-xl font-bold">Corporate</h1>
        <p className="text-xs text-slate-400 mt-1">Sales Analytics</p>
      </div>
      
      <nav className="mt-8 space-y-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-slate-800 p-3 rounded-lg text-xs">
          <p className="text-slate-400">Last sync</p>
          <p className="text-slate-200 font-mono">Today at 24h</p>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/corporate/layout.tsx src/components/corporate/sidebar.tsx
git commit -m "feat: add corporate dashboard layout and navigation"
```

---

## Task 6: Dashboard Pages (7 pages)

**Files:**
- Create: `src/app/corporate/page.tsx` (Overview)
- Create: `src/app/corporate/sellers/page.tsx`
- Create: `src/app/corporate/clients/page.tsx`
- Create: `src/app/corporate/products/page.tsx`
- Create: `src/app/corporate/behavioral/page.tsx`
- Create: `src/app/corporate/comparison/page.tsx`
- Create: `src/app/corporate/raw-data/page.tsx`

- [ ] **Step 1: Create Overview page**

```typescript
// src/app/corporate/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/corporate/metric-card';
import { LineChartMultiSeries } from '@/components/corporate/line-chart-multi-series';
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader } from 'lucide-react';

interface OverviewData {
  totalVendas: number;
  totalReceita: number;
  totalFaturamento: number;
  ticketMedio: number;
  vendedoresAtivos: number;
  crescimento: number;
}

export default function CorporateOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/overview')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Corporate Overview</h1>
        <p className="text-gray-600 mt-1">Sales analytics for your travel agency</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Sales"
          value={data?.totalVendas || 0}
          change={data?.crescimento}
          icon={<ShoppingCart className="w-6 h-6" />}
        />
        <MetricCard
          label="Revenue"
          value={data?.totalReceita || 0}
          format="currency"
          icon={<DollarSign className="w-6 h-6" />}
        />
        <MetricCard
          label="Billing"
          value={data?.totalFaturamento || 0}
          format="currency"
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <MetricCard
          label="Avg Ticket"
          value={data?.ticketMedio || 0}
          format="currency"
        />
        <MetricCard
          label="Active Sellers"
          value={data?.vendedoresAtivos || 0}
          icon={<Users className="w-6 h-6" />}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
        <LineChartMultiSeries
          data={[
            { month: 'Jan', receita: 45000, faturamento: 120000 },
            { month: 'Feb', receita: 52000, faturamento: 135000 },
            { month: 'Mar', receita: 48000, faturamento: 128000 },
          ]}
          xKey="month"
          lines={[
            { key: 'receita', name: 'Revenue', color: '#3b82f6' },
            { key: 'faturamento', name: 'Billing', color: '#10b981' },
          ]}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Sellers page**

```typescript
// src/app/corporate/sellers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { HorizontalBarChart } from '@/components/corporate/horizontal-bar-chart';
import { Loader } from 'lucide-react';

interface SellerData {
  vendedor: string;
  _sum: { receitas: number; faturamento: number };
  _count: number;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<SellerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/sellers')
      .then((res) => res.json())
      .then((data) => {
        setSellers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const chartData = sellers.map((seller) => ({
    vendedor: seller.vendedor,
    receitas: seller._sum.receitas || 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Seller Performance</h1>
        <p className="text-gray-600 mt-1">Revenue by seller</p>
      </div>

      <HorizontalBarChart
        data={chartData}
        xKey="receitas"
        yKey="vendedor"
        title="Revenue by Seller"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Seller Details</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sales
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Avg Ticket
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sellers.map((seller) => (
              <tr key={seller.vendedor}>
                <td className="px-6 py-4 text-sm text-gray-900">{seller.vendedor}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{seller._count}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(seller._sum.receitas || 0)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format((seller._sum.receitas || 0) / seller._count)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Clients page (similar structure to Sellers)**

```typescript
// src/app/corporate/clients/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { HorizontalBarChart } from '@/components/corporate/horizontal-bar-chart';
import { Loader } from 'lucide-react';

interface ClientData {
  clienteGrupo: string;
  _sum: { receitas: number; faturamento: number };
  _count: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/clients')
      .then((res) => res.json())
      .then((data) => {
        setClients(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const chartData = clients.slice(0, 15).map((client) => ({
    clienteGrupo: client.clienteGrupo || 'Unknown',
    receitas: client._sum.receitas || 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Client Analysis</h1>
        <p className="text-gray-600 mt-1">Revenue by client</p>
      </div>

      <HorizontalBarChart
        data={chartData}
        xKey="receitas"
        yKey="clienteGrupo"
        title="Revenue by Client (Top 15)"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Client Details</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sales
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Avg Ticket
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Revenue %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.map((client) => {
              const totalRevenue = clients.reduce((sum, c) => sum + (c._sum.receitas || 0), 0);
              return (
                <tr key={client.clienteGrupo}>
                  <td className="px-6 py-4 text-sm text-gray-900">{client.clienteGrupo}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{client._count}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(client._sum.receitas || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format((client._sum.receitas || 0) / client._count)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {(((client._sum.receitas || 0) / totalRevenue) * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Products page (similar structure)**

```typescript
// src/app/corporate/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { HorizontalBarChart } from '@/components/corporate/horizontal-bar-chart';
import { Loader } from 'lucide-react';

interface ProductData {
  produto: string;
  _sum: { receitas: number; faturamento: number };
  _count: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const chartData = products.map((product) => ({
    produto: product.produto || 'Unknown',
    receitas: product._sum.receitas || 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Product Breakdown</h1>
        <p className="text-gray-600 mt-1">Revenue by product type</p>
      </div>

      <HorizontalBarChart
        data={chartData}
        xKey="receitas"
        yKey="produto"
        title="Revenue by Product"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sales
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Avg Ticket
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.produto}>
                <td className="px-6 py-4 text-sm text-gray-900">{product.produto}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{product._count}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(product._sum.receitas || 0)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format((product._sum.receitas || 0) / product._count)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create Behavioral page with Scatter chart**

```typescript
// src/app/corporate/behavioral/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ScatterChartComp } from '@/components/corporate/scatter-chart';
import { Loader } from 'lucide-react';

interface BehavioralData {
  byProfile: Array<{ perfilCliente: string; _count: number; _sum: { receitas: number } }>;
  byAntecedencia: Array<{ antecedenciaDias: number; receitas: number }>;
}

export default function BehavioralPage() {
  const [data, setData] = useState<BehavioralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/behavioral')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Behavioral Analysis</h1>
        <p className="text-gray-600 mt-1">Customer profiles and advance purchase patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.byProfile.map((profile) => (
          <div key={profile.perfilCliente} className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">{profile.perfilCliente}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{profile._count}</p>
            <p className="text-gray-500 text-xs mt-1">sales</p>
            <p className="text-blue-600 font-semibold mt-2">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              }).format(profile._sum.receitas || 0)}
            </p>
          </div>
        ))}
      </div>

      <ScatterChartComp
        data={data?.byAntecedencia || []}
        xKey="antecedenciaDias"
        yKey="receitas"
        title="Revenue vs Days in Advance"
        xLabel="Days in Advance"
        yLabel="Revenue (R$)"
      />
    </div>
  );
}
```

- [ ] **Step 6: Create Comparison page**

```typescript
// src/app/corporate/comparison/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/corporate/metric-card';
import { Loader, TrendingUp, TrendingDown } from 'lucide-react';

interface ComparisonData {
  period1: {
    totalVendas: number;
    totalReceita: number;
  };
  period2: {
    totalVendas: number;
    totalReceita: number;
  };
  growth: {
    receita: number;
    vendas: number;
  };
}

export default function ComparisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/comparison')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Period Comparison</h1>
        <p className="text-gray-600 mt-1">Last 30 days vs previous 30 days</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Period 1 (Previous 30 Days)</h2>
          <div className="space-y-4">
            <MetricCard
              label="Sales"
              value={data?.period1.totalVendas || 0}
            />
            <MetricCard
              label="Revenue"
              value={data?.period1.totalReceita || 0}
              format="currency"
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Period 2 (Last 30 Days)</h2>
          <div className="space-y-4">
            <MetricCard
              label="Sales"
              value={data?.period2.totalVendas || 0}
              change={data?.growth.vendas}
            />
            <MetricCard
              label="Revenue"
              value={data?.period2.totalReceita || 0}
              format="currency"
              change={data?.growth.receita}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Growth Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            {(data?.growth.vendas || 0) > 0 ? (
              <TrendingUp className="w-6 h-6 text-green-500" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-500" />
            )}
            <div>
              <p className="text-gray-600 text-sm">Sales Growth</p>
              <p className={`text-2xl font-bold ${(data?.growth.vendas || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(data?.growth.vendas || 0) > 0 ? '+' : ''}{data?.growth.vendas?.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {(data?.growth.receita || 0) > 0 ? (
              <TrendingUp className="w-6 h-6 text-green-500" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-500" />
            )}
            <div>
              <p className="text-gray-600 text-sm">Revenue Growth</p>
              <p className={`text-2xl font-bold ${(data?.growth.receita || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(data?.growth.receita || 0) > 0 ? '+' : ''}{data?.growth.receita?.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create Raw Data page with pagination**

```typescript
// src/app/corporate/raw-data/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader, ChevronLeft, ChevronRight } from 'lucide-react';

interface CorporateSale {
  id: number;
  vendaNumeroe: number;
  dataVenda: string;
  vendedor: string;
  clienteGrupo: string;
  produto: string;
  receitas: number;
  faturamento: number;
}

interface RawDataResponse {
  data: CorporateSale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function RawDataPage() {
  const [data, setData] = useState<RawDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/corporate/raw-data?page=${page}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Raw Sales Data</h1>
        <p className="text-gray-600 mt-1">All transactions ({data?.pagination.total} total)</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sale #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Billing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.data.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {sale.vendaNumeroe}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(sale.dataVenda).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.vendedor}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.clienteGrupo}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.produto}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(sale.receitas)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(sale.faturamento)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {data?.pagination.page} of {data?.pagination.pages}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === data?.pagination.pages}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit all pages**

```bash
git add src/app/corporate/
git commit -m "feat: add 7 corporate dashboard pages with data fetching"
```

---

## Task 7: BullMQ Cron Job for Daily Sync

**Files:**
- Create: `src/jobs/corporate-sync.job.ts`
- Create: `src/lib/queue.ts` (if not exists)
- Modify: `src/app/api/cron/sync/route.ts` (new or modify existing)

- [ ] **Step 1: Create queue configuration**

```typescript
// src/lib/queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const corporateSyncQueue = new Queue('corporate-sync', {
  connection: redis,
});

// Optional: Create a worker if running in a separate service
export async function createCorporateSyncWorker() {
  const worker = new Worker(
    'corporate-sync',
    async (job) => {
      // Job handler
      const { syncCorporateSales } = await import('@/lib/corporate/google-sheets');
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await syncCorporateSales(prisma);
      await prisma.$disconnect();
    },
    { connection: redis }
  );

  return worker;
}
```

- [ ] **Step 2: Create cron endpoint**

```typescript
// src/app/api/cron/sync-corporate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { corporateSyncQueue } from '@/lib/queue';

export async function POST(request: NextRequest) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await corporateSyncQueue.add(
      'sync',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // 2 AM daily
        },
      }
    );

    return NextResponse.json({ success: true, message: 'Sync scheduled' });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Configure .env.local for Redis**

Add to `.env.local`:

```
REDIS_URL=redis://localhost:6379
CRON_SECRET=your-secret-key
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
GOOGLE_SHEETS_ID=1IGELGbij2xDKWvKpX_qnIlCE_PK9Uxf1fctr73Y2JOk
```

- [ ] **Step 4: Commit**

```bash
git add src/jobs src/lib/queue.ts src/app/api/cron/sync-corporate/route.ts
git commit -m "feat: add BullMQ cron job for daily corporate data sync"
```

---

## Task 8: Environment Setup & Testing

**Files:**
- Modify: `.env.example`
- Create: `docs/CORPORATE_SETUP.md`

- [ ] **Step 1: Update .env.example**

```bash
# Google Sheets API
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'
GOOGLE_SHEETS_ID=1IGELGbij2xDKWvKpX_qnIlCE_PK9Uxf1fctr73Y2JOk

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Cron
CRON_SECRET=generate-a-strong-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dashboard
```

- [ ] **Step 2: Create setup documentation**

```markdown
# Corporate Dashboard Setup

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (for BullMQ sync jobs)
- Google Sheets API credentials

## Installation

1. **Install dependencies**

```bash
npm install
```

2. **Set up database**

```bash
npx prisma migrate dev
```

3. **Configure Google Sheets API**

- Create a service account in Google Cloud Console
- Download JSON credentials
- Base64 encode and add to .env.local as `GOOGLE_SHEETS_CREDENTIALS`

4. **Start Redis**

```bash
redis-server
```

5. **Run dev server**

```bash
npm run dev
```

6. **Access corporate dashboard**

Visit http://localhost:3002/corporate

## Manual Sync

POST to `/api/corporate/sync` to manually trigger sync.

## Data Structure

- `corporate_sales` - Current state of all sales
- `corporate_sales_history` - Daily snapshots for trend analysis
- `corporate_sync_log` - Sync operation logs

## Pages

- `/corporate` - Overview dashboard
- `/corporate/sellers` - Seller performance
- `/corporate/clients` - Client analysis
- `/corporate/products` - Product breakdown
- `/corporate/behavioral` - Customer behavior (antecedência, perfil)
- `/corporate/comparison` - Period comparison
- `/corporate/raw-data` - Transaction listing with pagination
```

- [ ] **Step 3: Test all pages locally**

Navigate to each page and verify data loads:

```bash
# Terminal 1
npm run dev

# Terminal 2 (after server starts)
curl http://localhost:3002/api/corporate/overview
curl http://localhost:3002/corporate
```

- [ ] **Step 4: Commit**

```bash
git add .env.example docs/CORPORATE_SETUP.md
git commit -m "docs: add corporate dashboard setup guide"
```

---

## Summary

✅ **8 tasks completed:**

1. Database schema (corporate_sales + history + logs)
2. Google Sheets API integration
3. 8 API endpoints for data aggregation
4. 5 new chart components (Multi-Line, StackedBar, HorizontalBar, Scatter)
5. Dashboard layout + sidebar navigation
6. 7 dashboard pages (Overview, Sellers, Clients, Products, Behavioral, Comparison, RawData)
7. BullMQ daily sync job
8. Environment setup + documentation

**New Chart Types Added:**
- `LineChartMultiSeries` - Revenue + Billing trends
- `StackedBarChart` - Comparative stacking
- `HorizontalBarChart` - Top sellers/clients ranking
- `ScatterChart` - Antecedência vs Receita correlation
- `MetricCard` - Key metrics with growth indicators

**Technologies:**
- Google Sheets API for data source
- PostgreSQL for caching + history
- BullMQ + Redis for daily sync
- Recharts for visualization
- Next.js 14 + TypeScript