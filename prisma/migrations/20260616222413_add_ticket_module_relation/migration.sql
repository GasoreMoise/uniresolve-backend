-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "moduleId" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_moduleId_idx" ON "Ticket"("moduleId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;
