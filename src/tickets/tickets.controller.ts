import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseInterceptors, 
  UploadedFiles, 
  ValidationPipe, 
  UseGuards,
  Patch,
  Param 
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TicketsService } from './tickets.service';
import { SubmitTicketDto, UpdateTicketStatusDto } from './dto/submit-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { GetUserId } from '../auth/decorators/get-user.decorator'; 
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  /**
   * Secure Endpoint: Processes incoming multipart application forms,
   * handles binary attachment disk storage arrays, and saves the new ticket record.
   */
  @Post('submit')
  @UseGuards(JwtAuthGuard) // Enforces token authorization clearance before allowing code execution
  @UseInterceptors(
    FilesInterceptor('attachments', 5, {
      storage: diskStorage({
        destination: './uploads', // Creates a physical folder mapping in your directory root
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async submitTicket(
    @Body(new ValidationPipe()) dto: SubmitTicketDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUserId() studentId: string, // Automatically fetches the current authenticated user ID in real time
  ) {
    return this.ticketsService.createTicket(dto, studentId, files);
  }

  /**
   * Secure Endpoint: Resolves the caller identity via incoming signed JWT payloads
   * and fetches their historical tickets registry ledger chronologically.
   */
  @Get('student')
  @UseGuards(JwtAuthGuard) // Protects the student queue matrix from anonymous or cross-account data scraping
  async getStudentQueue(@GetUserId() studentId: string) {
    return this.ticketsService.getStudentTickets(studentId);
  }

  @Get('department')
  @UseGuards(JwtAuthGuard) // Protects back-office ledgers from unauthorized scrapers
  async getDepartmentQueue(@GetUserId() staffId: string) {
    return this.ticketsService.getDepartmentTickets(staffId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard) // Blocks unauthorized accounts from altering critical ticket records
  async updateStatus(
    @Param('id') ticketId: string,
    @Body(new ValidationPipe()) dto: UpdateTicketStatusDto,
    @GetUserId() staffId: string, // Captures the exact staff UUID executing this state change in real time
  ) {
    return this.ticketsService.updateTicketStatus(ticketId, dto, staffId);
  }
}