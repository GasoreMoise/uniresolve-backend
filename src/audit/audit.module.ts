import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Global() // Makes the AuditService available everywhere (like TicketsService) without needing constant imports
@Module({
  controllers: [AuditController], // ◄ Wires up the API routes
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}