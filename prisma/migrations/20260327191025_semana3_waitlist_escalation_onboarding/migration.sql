-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ConversationStatus" ADD VALUE 'ESCALATED';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedReason" TEXT;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0;

-- AlterTable (fix drift: User.updatedAt was in schema but not in DB)
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "partySize" INTEGER NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaitlistEntry_restaurantId_dateTime_status_idx" ON "WaitlistEntry"("restaurantId", "dateTime", "status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_restaurantId_status_idx" ON "WaitlistEntry"("restaurantId", "status");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
