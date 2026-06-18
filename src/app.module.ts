import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketsModule } from './tickets/tickets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { TriageModule } from './triage/triage.module';
import { EventsModule } from './events/events.module';
import { ProfileModule } from './profile/profile.module';
import { GradesModule } from './grades/grades.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [AuthModule, PrismaModule, TicketsModule, AnalyticsModule, AuditModule, TriageModule, EventsModule, ProfileModule, GradesModule, FinanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
