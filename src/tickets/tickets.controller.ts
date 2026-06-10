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
  Param,
  Res 
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TicketsService } from './tickets.service';
import { SubmitTicketDto, UpdateTicketStatusDto } from './dto/submit-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { GetUserId } from '../auth/decorators/get-user.decorator'; 
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync } from 'fs';

import type { Response } from 'express';

@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('attachments', 5, {
      storage: diskStorage({
        destination: './uploads',
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
    @GetUserId() studentId: string,
  ) {
    return this.ticketsService.createTicket(dto, studentId, files);
  }

  @Get('student')
  @UseGuards(JwtAuthGuard)
  async getStudentQueue(@GetUserId() studentId: string) {
    return this.ticketsService.getStudentTickets(studentId);
  }

  @Get('department')
  @UseGuards(JwtAuthGuard)
  async getDepartmentQueue(@GetUserId() staffId: string) {
    return this.ticketsService.getDepartmentTickets(staffId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') ticketId: string,
    @Body(new ValidationPipe()) dto: UpdateTicketStatusDto,
    @GetUserId() staffId: string,
  ) {
    return this.ticketsService.updateTicketStatus(ticketId, dto, staffId);
  }

  @Patch(':id/resolve-assessment')
  @UseGuards(JwtAuthGuard)
  async resolveSpecialAssessment(
    @Param('id') ticketId: string,
    @Body() dto: { date: string; venue: string; notes?: string },
    @GetUserId() staffId: string,
  ) {
    return this.ticketsService.resolveAssessmentTicket(ticketId, dto, staffId);
  }

  @Patch(':id/review-decision')
  @UseGuards(JwtAuthGuard)
  async reviewDecision(
    @Param('id') ticketId: string,
    @Body() dto: { status: 'REJECTED' | 'ACTION_REQUIRED'; comment: string },
    @GetUserId() staffId: string,
  ) {
    return this.ticketsService.updateReviewDecision(ticketId, dto, staffId);
  }

  @Patch(':id/resolve-exam-claim')
  @UseGuards(JwtAuthGuard)
  async resolveExamClaim(
    @Param('id') ticketId: string,
    @Body() dto: { isMarkAltered: boolean; revisedMarkInfo?: string; notes: string },
    @GetUserId() staffId: string,
  ) {
    return this.ticketsService.commitExamClaimResolution(ticketId, dto, staffId);
  }

  @Patch(':id/resolve-transcript')
  @UseGuards(JwtAuthGuard)
  async resolveTranscript(
    @Param('id') ticketId: string,
    @Body() dto: { decision: 'APPROVED' | 'REJECTED'; reason?: string },
    @GetUserId() staffId: string,
  ) {
    return this.ticketsService.commitTranscriptResolution(ticketId, dto, staffId);
  }

  // ◄ FIX: Removed the absolute path hack. NestJS will now map this perfectly to /api/tickets/transcripts/download/:filename
  @Get('transcripts/download/:filename')
  async downloadTranscript(
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const filePath = join(process.cwd(), 'uploads', 'transcripts', filename);

    if (!existsSync(filePath)) {
      return res.status(404).json({
        statusCode: 404,
        message: `The physical transcript file (${filename}) could not be located on the server disk. It may not have been generated yet.`,
        error: 'Not Found'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    
    return res.sendFile(filePath);
  }
}