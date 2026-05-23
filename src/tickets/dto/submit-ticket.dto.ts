// Inside src/tickets/dto/submit-ticket.dto.ts
import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '@prisma/client';

/**
 * Existing working DTO class structure for submissions
 */
export class SubmitTicketDto {
  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsString()
  serviceName: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  isInternational: string;
}

/**
 * ◄ APPEND THIS CLASS DIRECTLY HERE TO TERMINATE COMPILER EXCEPTION PATHS
 */
export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus, { message: 'Invalid ticket state transformation target.' })
  status: TicketStatus;

  @IsString()
  @IsOptional()
  comment?: string;
}