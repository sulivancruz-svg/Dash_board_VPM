-- CreateTable for CorporateSettings
CREATE TABLE "corporate_settings" (
    "id" TEXT NOT NULL,
    "googleSheetsId" TEXT NOT NULL,
    "googleSheetsGid" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_settings_pkey" PRIMARY KEY ("id")
);
