import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({

  imports: [PrismaModule, AuditModule], 
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
