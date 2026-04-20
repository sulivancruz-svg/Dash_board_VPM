-- CreateTable
CREATE TABLE "CorporateSale" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "seller" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "destination" TEXT NOT NULL,
    "personType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "billing" DOUBLE PRECISION NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "profile" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateSalesSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSales" INTEGER NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL,
    "totalBilling" DOUBLE PRECISION NOT NULL,
    "avgTicket" DOUBLE PRECISION NOT NULL,
    "avgLeadTime" INTEGER NOT NULL,
    "topSellerName" TEXT NOT NULL,
    "topSellerRevenue" DOUBLE PRECISION NOT NULL,
    "monthlyBreakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateSalesSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporateSale_saleNumber_key" ON "CorporateSale"("saleNumber");

-- CreateIndex
CREATE INDEX "CorporateSale_saleDate_idx" ON "CorporateSale"("saleDate");

-- CreateIndex
CREATE INDEX "CorporateSale_seller_idx" ON "CorporateSale"("seller");

-- CreateIndex
CREATE INDEX "CorporateSale_client_idx" ON "CorporateSale"("client");

-- CreateIndex
CREATE INDEX "CorporateSale_product_idx" ON "CorporateSale"("product");

-- CreateIndex
CREATE INDEX "CorporateSale_profile_idx" ON "CorporateSale"("profile");

-- CreateIndex
CREATE INDEX "CorporateSale_leadTimeDays_idx" ON "CorporateSale"("leadTimeDays");

-- CreateIndex
CREATE INDEX "CorporateSalesSnapshot_snapshotDate_idx" ON "CorporateSalesSnapshot"("snapshotDate");
