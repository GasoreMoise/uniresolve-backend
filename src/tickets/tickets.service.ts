import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitTicketDto, UpdateTicketStatusDto } from './dto/submit-ticket.dto';
import { IssueCategory } from '@prisma/client';
import { SmsService } from '../sms/sms.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events/events.gateway';
import PDFDocument from 'pdfkit';
import { join } from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private smsService: SmsService,
    private auditService: AuditService, 
    private eventsGateway: EventsGateway,
  ) {}

  async createTicket(dto: SubmitTicketDto, studentId: string, files: Express.Multer.File[]) {
    // SPECIFIC RESTRICTION: Hard Financial Block ONLY applies to Transcript Requests
    if (dto.serviceName.toLowerCase().includes('transcript')) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: studentId }
      });
      
      if (!profile?.isFinanciallyCleared) {
        throw new BadRequestException('Financial Hold: You must clear your outstanding balance with the Finance Office before requesting an official transcript.');
      }
    }

    const shortUuid = Math.random().toString(36).substring(2, 8).toUpperCase();
    const trackingCode = `UR-2026-${shortUuid}`;

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          trackingCode,
          studentId,
          category: dto.category as IssueCategory, 
          serviceName: dto.serviceName,
          description: dto.description,
          isInternational: dto.isInternational === 'true',
          moduleId: dto.moduleId || null,
          status: 'SUBMITTED',
        },
      });

      if (files && files.length > 0) {
        const attachmentData = files.map((file) => ({
          ticketId: ticket.id,
          fileUrl: `/uploads/${file.filename}`,
          fileName: file.originalname,
        }));

        await tx.attachment.createMany({
          data: attachmentData,
        });
      }

      await tx.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          previousState: 'SUBMITTED',
          newState: 'SUBMITTED',
          comment: 'Issue initiated on the central digital platform.',
        },
      });

      await this.auditService.logAction(
        'TICKET_CREATED',
        'Ticket',
        ticket.id,
        studentId,
        { category: ticket.category, trackingCode: ticket.trackingCode }
      );

      return {
        message: 'Your request has been successfully recorded.',
        trackingCode: ticket.trackingCode,
        status: ticket.status,
      };
    });
  }

  async studentResubmitTicket(ticketId: string, studentId: string, payload: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    
    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (ticket.studentId !== studentId) throw new BadRequestException('Forbidden: You do not own this ticket.');
    if (ticket.status !== 'ACTION_REQUIRED') throw new BadRequestException('Only tickets marked as Action Required can be resubmitted.');

    if (ticket.serviceName.toLowerCase().includes('transcript')) {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: studentId } });
      if (!profile?.isFinanciallyCleared) {
        throw new BadRequestException('Financial Hold: You must clear your outstanding balance with Finance before resubmitting this transcript request.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'UNDER_REVIEW' } 
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          previousState: 'ACTION_REQUIRED',
          newState: 'UNDER_REVIEW',
          comment: 'Student has resubmitted the required information or documentation.',
        }
      });

      this.eventsGateway.emitTicketUpdate(studentId, ticketId, 'UNDER_REVIEW');
      
      return { message: 'Resubmission successful.', ticketId };
    });
  }

  async getStudentTickets(studentId: string) {
    return this.prisma.ticket.findMany({
      where: { studentId },
      include: {
        module:{
          select:{
            code:true,
            title:true,
            lecturer: {select: {fullName: true}}
          }
        },
        attachments: true,
        history: {
          orderBy: { changedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDepartmentTickets(staffId: string) {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { department: true, role: true },
    });
  
    if (!staff || staff.role === 'STUDENT') {
      throw new BadRequestException('Access denied. Academic profiles cannot access departmental ledgers.');
    }
  
    if (staff.role === 'LECTURER') {
      return this.prisma.ticket.findMany({
        where: { 
          module: { lecturerId: staffId } 
        },
        include: {
          student: { select: { fullName: true, email: true, phoneNumber: true, studentProfile: { select: { isFinanciallyCleared: true } } } },
          module: { select: { code: true, title: true } }, 
          attachments: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    let categoryFilter: any = {};

    // ◄ EXCLUSIVE ISOLATION ROUTING BLOCK ►
    if (staff.role === 'ADMIN') {
      categoryFilter = {};
    } 
    else if (staff.department === 'FINANCE') {
      categoryFilter = { category: 'FINANCIAL_GATEWAYS' };
    } 
    else if (staff.department === 'REGISTRAR') {
      // ◄ FIXED: Registrar receives their 3 specific records tasks.
      categoryFilter = { 
        OR: [
          { serviceName: { contains: 'Transcript Request', mode: 'insensitive' } },
          { serviceName: { contains: 'Student Registration', mode: 'insensitive' } },
          { serviceName: { contains: 'Card Replacement', mode: 'insensitive' } }
        ]
      };
    } 
    else if (staff.department === 'FACULTY_HOD') {
      // ◄ FIXED: HOD receives Academic Progression requests, but the Registrar's tasks are blocked.
      categoryFilter = { 
        category: 'ACADEMIC_PROGRESSION_VERIFICATION',
        NOT: { 
          OR: [
            { serviceName: { contains: 'Card Replacement', mode: 'insensitive' } },
            { serviceName: { contains: 'Student Registration', mode: 'insensitive' } }
          ]
        }
      };
    } 
    else if (staff.department === 'CAMPUS_OPERATIONS' || staff.department === 'ESTATE_MANAGEMENT') {
      categoryFilter = { category: 'ADMINISTRATIVE_OPERATIONAL_REQUESTS' };
    } 
    else if (staff.department === 'GENERAL_SUPPORT') {
      categoryFilter = { category: 'DIRECT_SUPPORT_EXTERNAL_COMPLIANCE' };
    }
  
    return this.prisma.ticket.findMany({
      where: categoryFilter,
      include: {
        student: { select: { fullName: true, email: true, studentProfile: { select: { isFinanciallyCleared: true } } } },
        module: { select: { code: true, title: true } }, 
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto, staffId: string) {
    const existingTicket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { student: { select: { phoneNumber: true } } },
    });

    if (!existingTicket) {
      throw new NotFoundException(`No ticket found matching identifier: ${ticketId}`);
    }

    if (dto.status === 'ACTION_REQUIRED' && (!dto.comment || dto.comment.trim() === '')) {
      throw new BadRequestException('A descriptive audit comment is mandatory when requesting action from a student.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: { status: dto.status },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          staffId,
          previousState: existingTicket.status,
          newState: dto.status,
          comment: dto.comment || `Case tracking status transitioned to ${dto.status}.`,
        },
      });

      if (dto.status === 'RESOLVED' && existingTicket.category === 'FINANCIAL_GATEWAYS') {
        const studentProfile = await tx.studentProfile.findUnique({ where: { userId: existingTicket.studentId } });
        if (studentProfile) {
          await tx.studentProfile.update({
            where: { id: studentProfile.id },
            data: { isFinanciallyCleared: true }
          });
        }
      }

      if (existingTicket.student?.phoneNumber) {
        this.smsService.sendStatusAlert(existingTicket.student.phoneNumber, existingTicket.trackingCode, dto.status);
      }

      await this.auditService.logAction(
        'STATUS_TRANSITION',
        'Ticket',
        ticketId,
        staffId,
        { previousStatus: existingTicket.status, newStatus: dto.status }
      );

      this.eventsGateway.emitTicketUpdate(existingTicket.studentId, updatedTicket.id, updatedTicket.status);

      return {
        message: 'Ticket status successfully updated and archived in the ledger.',
        ticketId: updatedTicket.id,
        newStatus: updatedTicket.status,
      };
    });
  }

  async resolveAssessmentTicket(ticketId: string, dto: { date: string; venue: string; notes?: string }, staffId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { student: { select: { phoneNumber: true } } },
    });

    if (!ticket) throw new NotFoundException(`No ticket found matching ID: ${ticketId}`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
          assessmentDate: new Date(dto.date),
          assessmentVenue: dto.venue,
          lecturerNotes: dto.notes,
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          staffId,
          previousState: ticket.status,
          newState: 'RESOLVED',
          comment: dto.notes || `Special assessment has been officially scheduled at ${dto.venue}.`,
        },
      });

      if (ticket.student?.phoneNumber) {
        this.smsService.sendStatusAlert(ticket.student.phoneNumber, ticket.trackingCode, `RESOLVED (Scheduled on ${dto.date} at ${dto.venue})`);
      }

      await this.auditService.logAction(
        'ASSESSMENT_SCHEDULED_AND_RESOLVED',
        'Ticket',
        ticketId,
        staffId,
        { assessmentDate: dto.date, assessmentVenue: dto.venue }
      );

      this.eventsGateway.emitTicketUpdate(ticket.studentId, updated.id, 'RESOLVED');

      return { message: 'Special assessment resolved and scheduled successfully.', ticketId: updated.id };
    });
  }

  async updateReviewDecision(ticketId: string, dto: { status: 'REJECTED' | 'ACTION_REQUIRED'; comment: string }, staffId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { student: { select: { phoneNumber: true } } },
    });

    if (!ticket) throw new NotFoundException(`No ticket found matching ID: ${ticketId}`);
    if (!dto.comment || dto.comment.trim() === '') {
      throw new BadRequestException('A reason comment is mandatory for rejections or additional info requests.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { status: dto.status as any },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          staffId,
          previousState: ticket.status,
          newState: dto.status as any,
          comment: dto.comment,
        },
      });

      if (ticket.student?.phoneNumber) {
        this.smsService.sendStatusAlert(ticket.student.phoneNumber, ticket.trackingCode, `${dto.status}: ${dto.comment.substring(0, 30)}...`);
      }

      await this.auditService.logAction(
        'REVIEW_DECISION_ENFORCED',
        'Ticket',
        ticketId,
        staffId,
        { decision: dto.status, logic: 'Review bounds hit' }
      );

      this.eventsGateway.emitTicketUpdate(ticket.studentId, updated.id, dto.status);

      return { message: `Ticket review status changed to ${dto.status}.`, ticketId: updated.id };
    });
  }

  async commitExamClaimResolution(ticketId: string, dto: { isMarkAltered: boolean; revisedMarkInfo?: string; notes: string }, staffId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { student: { select: { phoneNumber: true } } },
    });

    if (!ticket) throw new NotFoundException(`No claim matching ID found.`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
          isMarkAltered: dto.isMarkAltered,
          revisedMarkInfo: dto.isMarkAltered ? dto.revisedMarkInfo : null,
          hodAuditNotes: dto.notes,
        },
      });

      const auditSummary = dto.isMarkAltered 
        ? `Marks updated: ${dto.revisedMarkInfo}` 
        : 'Marks confirmed accurate matching official book sheet.';

      await tx.ticketHistory.create({
        data: {
          ticketId,
          staffId,
          previousState: ticket.status,
          newState: 'RESOLVED',
          comment: `${auditSummary} Note: ${dto.notes}`,
        },
      });

      if (ticket.student?.phoneNumber) {
        this.smsService.sendStatusAlert(ticket.student.phoneNumber, ticket.trackingCode, 'RESOLVED');
      }

      await this.auditService.logAction(
        'EXAM_CLAIM_ADJUDICATED',
        'Ticket',
        ticketId,
        staffId,
        { markAltered: dto.isMarkAltered, revisedMarkInfo: dto.revisedMarkInfo }
      );

      this.eventsGateway.emitTicketUpdate(ticket.studentId, updated.id, 'RESOLVED');

      return { message: 'Exam claim resolution archived successfully.', ticketId: updated.id };
    });
  }

  async commitTranscriptResolution(ticketId: string, dto: { decision: 'APPROVED' | 'REJECTED'; reason?: string }, staffId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { 
        student: { 
          select: { 
            fullName: true, 
            email: true, 
            phoneNumber: true,
            studentProfile: {
              include: {
                registeredModules: {
                  include: {
                    module: true
                  }
                }
              }
            },
            grades: true 
          } 
        } 
      },
    });

    if (!ticket) throw new NotFoundException('Transcript request matching token reference unresolvable.');

    return this.prisma.$transaction(async (tx) => {
      if (dto.decision === 'REJECTED') {
        const updated = await tx.ticket.update({
          where: { id: ticketId },
          data: { status: 'REJECTED' },
        });

        await tx.ticketHistory.create({
          data: {
            ticketId,
            staffId,
            previousState: ticket.status,
            newState: 'REJECTED',
            comment: dto.reason || 'Transcript generation denied due to incomplete registrar documentation.',
          },
        });

        if (ticket.student?.phoneNumber) {
          this.smsService.sendStatusAlert(ticket.student.phoneNumber, ticket.trackingCode, 'REJECTED');
        }

        await this.auditService.logAction(
          'TRANSCRIPT_REJECTED',
          'Ticket',
          ticketId,
          staffId,
          { decision: dto.decision, reason: dto.reason }
        );

        this.eventsGateway.emitTicketUpdate(ticket.studentId, updated.id, 'REJECTED');

        return { message: 'Transcript request marked as rejected.', ticketId: updated.id };
      }

      const filename = `OFFICIAL_TRANSCRIPT_${ticket.trackingCode}.pdf`;
      const uploadDir = join(process.cwd(), 'uploads', 'transcripts');
      const filePath = join(uploadDir, filename);

      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = createWriteStream(filePath);
        
        doc.pipe(stream);

        doc.fillColor('#2B35AF').fontSize(18).font('Helvetica-Bold').text('UNIVERSITY OF RWANDA', { align: 'center' });
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text('OFFICE OF THE REGISTRAR // ACADEMIC REGISTRY', { align: 'center' });
        doc.moveDown(1.5);

        doc.rect(50, doc.y, 495, 3).fill('#2B35AF');
        doc.moveDown(1.5);

        doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('OFFICIAL PROVISIONAL STATEMENT OF RESULTS');
        doc.moveDown(0.5);
        
        doc.fontSize(10).font('Helvetica')
           .text(`Student Name: ${ticket.student?.fullName}`)
           .text(`Registration Number: ${ticket.student?.studentProfile?.registrationNumber || 'N/A'}`)
           .text(`Program: ${ticket.student?.studentProfile?.program || 'N/A'}`)
           .text(`Tracking Reference: ${ticket.trackingCode}`)
           .text(`Date of Issue: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
        
        doc.moveDown(2);

        const tableTop = doc.y;
        doc.font('Helvetica-Bold').fillColor('#ffffff');
        doc.rect(50, tableTop, 495, 20).fill('#2B35AF');
        
        doc.fillColor('#ffffff')
           .text('Module Code', 60, tableTop + 5, { width: 90 })
           .text('Module Title', 160, tableTop + 5, { width: 220 })
           .text('Credits', 390, tableTop + 5, { width: 50, align: 'center' })
           .text('Final Mark', 450, tableTop + 5, { width: 80, align: 'right' });

        doc.font('Helvetica').fillColor('#334155');
        
        let rowTop = tableTop + 20;

        const registrations = ticket.student?.studentProfile?.registeredModules || [];
        const grades = ticket.student?.grades || [];

        registrations.forEach((reg, index) => {
          if (index % 2 === 0) {
            doc.rect(50, rowTop, 495, 20).fill('#f8fafc');
          }
          
          const moduleGrade = grades.find(g => g.moduleId === reg.moduleId);
          const finalScoreDisplay = moduleGrade && moduleGrade.finalScore !== null 
            ? `${moduleGrade.finalScore} / 100` 
            : 'Awaiting';

          doc.fillColor('#0f172a')
             .text(reg.module.code, 60, rowTop + 5)
             .text(reg.module.title, 160, rowTop + 5, { width: 220, height: 15, ellipsis: true })
             .text(reg.module.credits.toString(), 390, rowTop + 5, { align: 'center' })
             .text(finalScoreDisplay, 450, rowTop + 5, { align: 'right' });

          rowTop += 20;
        });

        if (registrations.length === 0) {
          doc.rect(50, rowTop, 495, 20).fill('#f8fafc');
          doc.fillColor('#94a3b8').text('No registered modules found for this student.', 60, rowTop + 5);
          rowTop += 20;
        }

        doc.moveDown(4);

        const securityHash = Math.random().toString(16).substring(2, 10).toUpperCase();
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94a3b8')
           .text(`SECURE DIGITAL LEDGER RECORD VERIFICATION METRICS KEY: [UR-SEC-${securityHash}-2026]`, { align: 'center' });

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      const compiledPdfUrl = `/tickets/transcripts/download/${filename}`;

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
          generatedTranscriptUrl: compiledPdfUrl,
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          staffId,
          previousState: ticket.status,
          newState: 'RESOLVED',
          comment: 'Provisional statement results audited. Official PDF transcript generated and secured in the system registry.',
        },
      });

      if (ticket.student?.phoneNumber) {
        this.smsService.sendStatusAlert(ticket.student.phoneNumber, ticket.trackingCode, 'RESOLVED');
      }

      await this.auditService.logAction(
        'TRANSCRIPT_GENERATED_AND_ISSUED',
        'Ticket',
        ticketId,
        staffId,
        { documentUrl: compiledPdfUrl }
      );

      this.eventsGateway.emitTicketUpdate(ticket.studentId, updated.id, 'RESOLVED');

      return { message: 'Transcript successfully compiled and released.', ticketId: updated.id };
    });
  }

  async approveCardReplacement(ticketId: string, staffId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { student: { select: { phoneNumber: true } } },
    });

    if (!ticket) throw new NotFoundException('Ticket not found.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'RESOLVED' },
      });

      const automatedMessage = 'Your student card replacement has been approved and reprinted. Please proceed to the Registrar\'s office to pick up your new physical card.';

      await tx.ticketHistory.create({
        data: {
          ticketId,
          staffId,
          previousState: ticket.status,
          newState: 'RESOLVED',
          comment: automatedMessage,
        },
      });

      if (ticket.student?.phoneNumber) {
        this.smsService.sendStatusAlert(
          ticket.student.phoneNumber, 
          ticket.trackingCode, 
          `APPROVED: ${automatedMessage}`
        );
      }

      await this.auditService.logAction(
        'CARD_REPLACEMENT_APPROVED',
        'Ticket',
        ticketId,
        staffId,
        { automatedMessageSent: true }
      );

      this.eventsGateway.emitTicketUpdate(ticket.studentId, updated.id, 'RESOLVED');

      return { message: 'Card replacement approved. Student notified for pickup.', ticketId: updated.id };
    });
  }
}