// src/tickets/tickets.module.ts
import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module'; // ◄ 1. Import the AuditModule here

@Module({
  imports: [
    AuditModule,
    EventsModule // ◄ 2. Register it in the imports array
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService, 
    PrismaService, 
    SmsService 
  ], 
})
export class TicketsModule {}