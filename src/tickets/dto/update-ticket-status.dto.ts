import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus, { message: 'Invalid ticket state transformation target.' })
  status: TicketStatus;

  @IsString()
  @IsOptional()
  comment?: string;
}