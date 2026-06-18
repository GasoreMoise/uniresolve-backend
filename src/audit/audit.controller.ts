import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs() {
    return this.auditService.getRecentLogs();
  }
}