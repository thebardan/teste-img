-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";

-- CreateEnum
CREATE TYPE "DriveMatchStatus" AS ENUM ('AUTO_MATCHED', 'MANUAL_MATCHED', 'UNMATCHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DriveSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'DELETED', 'ERROR');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "embedding" vector(256);

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "driveImageId" TEXT;

-- AlterTable
ALTER TABLE "SalesSheetVersion" ADD COLUMN     "artGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "artImageKey" TEXT;

-- CreateTable
CREATE TABLE "DriveFolder" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "embedding" vector(256),
    "productId" TEXT,
    "matchScore" DOUBLE PRECISION,
    "matchStatus" "DriveMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveImage" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "driveModifiedAt" TIMESTAMP(3) NOT NULL,
    "storageKey" TEXT,
    "syncStatus" "DriveSyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriveFolder_driveId_key" ON "DriveFolder"("driveId");

-- CreateIndex
CREATE INDEX "DriveFolder_productId_idx" ON "DriveFolder"("productId");

-- CreateIndex
CREATE INDEX "DriveFolder_matchStatus_idx" ON "DriveFolder"("matchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DriveImage_driveId_key" ON "DriveImage"("driveId");

-- CreateIndex
CREATE INDEX "DriveImage_driveFolderId_idx" ON "DriveImage"("driveFolderId");

-- CreateIndex
CREATE INDEX "DriveImage_syncStatus_idx" ON "DriveImage"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_driveImageId_key" ON "ProductImage"("driveImageId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_driveImageId_fkey" FOREIGN KEY ("driveImageId") REFERENCES "DriveImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveImage" ADD CONSTRAINT "DriveImage_driveFolderId_fkey" FOREIGN KEY ("driveFolderId") REFERENCES "DriveFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
