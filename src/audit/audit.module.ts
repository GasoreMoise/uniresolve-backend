import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../prisma/prisma.module'; // Ensure PrismaModule is imported

@Module({
  imports: [PrismaModule], // We need Prisma to save the logs
  providers: [AuditService],
  exports: [AuditService], // Crucial: Allows other modules to use logAction()
})
export class AuditModule {}
