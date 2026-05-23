// src/tickets/tickets.module.ts
import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../sms/sms.service'; // ◄ Verify this relative path points correctly to your file location

@Module({
  controllers: [TicketsController],
  providers: [
    TicketsService, 
    PrismaService, 
    SmsService // ◄ Registered as an active operational provider node
  ], 
})
export class TicketsModule {}

