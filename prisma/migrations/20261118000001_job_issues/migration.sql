-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('FIXED', 'PARTIAL', 'NOT_FIXED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "workNotes" TEXT;

-- CreateTable
CREATE TABLE "JobIssue" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "status" "IssueStatus",
    "note" TEXT,
    "reportedById" TEXT,
    "reportedAt" TIMESTAMP(3),

    CONSTRAINT "JobIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobIssue_jobId_idx" ON "JobIssue"("jobId");

-- AddForeignKey
ALTER TABLE "JobIssue" ADD CONSTRAINT "JobIssue_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIssue" ADD CONSTRAINT "JobIssue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
