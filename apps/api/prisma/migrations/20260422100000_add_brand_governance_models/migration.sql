-- AlterTable
ALTER TABLE "Client" ADD COLUMN "brandProfile" JSONB;

-- CreateTable
CREATE TABLE "TonePreset" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tone" TEXT NOT NULL,
  "voice" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TonePreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TonePreset_category_key" ON "TonePreset"("category");

-- CreateTable
CREATE TABLE "ChannelCtaPreset" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "ctas" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChannelCtaPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelCtaPreset_channel_key" ON "ChannelCtaPreset"("channel");
