import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitTicketDto, UpdateTicketStatusDto } from './dto/submit-ticket.dto';
// IMPORT THE DATA ENUMS STRAIGHT FROM YOUR GENERATED PRISMA CLIENT MODULE
import { IssueCategory, Department } from '@prisma/client';
import { SmsService } from '../sms/sms.service'; // INFOBIP GATEWAY LOGISTICS DISPATCH INTERFACE

@Injectable()
export class TicketsService {
  // INJECT BOTH PRISMA AND THE SMS GATEWAY UTILITY SERVICE THROUGH THE CONSTRUCTOR
  constructor(
    private prisma: PrismaService,
    private smsService: SmsService,
  ) {}

  async createTicket(dto: SubmitTicketDto, studentId: string, files: Express.Multer.File[]) {
    // 1. Generate a short, scannable tracking code for your dashboard's search bar component
    const shortUuid = Math.random().toString(36).substring(2, 8).toUpperCase();
    const trackingCode = `UR-2026-${shortUuid}`;

    // 2. Wrap operations inside a database transaction to protect records against corruption
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          trackingCode,
          studentId,
          // EXPLICIT TYPE CAST APPLIED TO PASS PRISMA ENUM VALIDATION CHECKS
          category: dto.category as IssueCategory,
          serviceName: dto.serviceName,
          description: dto.description,
          isInternational: dto.isInternational === 'true',
          status: 'SUBMITTED',
        },
      });

      // 3. Loop through and upload evidence paths (e.g., bank slips, medical sheets)
      if (files && files.length > 0) {
        const attachmentData = files.map((file) => ({
          ticketId: ticket.id,
          fileUrl: `/uploads/${file.filename}`, // Simulating disk pathing; easily targets S3 buckets later
          fileName: file.originalname,
        }));

        await tx.attachment.createMany({
          data: attachmentData,
        });
      }

      // 4. Seed the auditing trace ledger for transparency
      await tx.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          previousState: 'SUBMITTED',
          newState: 'SUBMITTED',
          comment: 'Issue initiated on the central digital platform.',
        },
      });

      return {
        message: 'Your request has been successfully recorded.',
        trackingCode: ticket.trackingCode,
        status: ticket.status,
      };
    });
  }

  async getStudentTickets(studentId: string) {
    return this.prisma.ticket.findMany({
      where: {
        studentId: studentId, // Filters rows so students can ONLY see their own files
      },
      include: {
        attachments: true, // Pulls along file upload metadata paths if they exist
        // ◄ PULL ALONG THE HISTORICAL COMMENTARY LEDGER TRAIL FOR IN-APP NOTIFICATIONS
        history: {
          orderBy: {
            changedAt: 'desc', // Forces the latest officer comments to sit straight at index [0]
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Forces fresh case files to float straight to the top
      },
    });
  }

  async getDepartmentTickets(staffId: string) {
    // 1. Recover the staff profile row to verify their administrative desk placement
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { department: true, role: true },
    });
  
    if (!staff || staff.role === 'STUDENT') {
      throw new BadRequestException('Access denied. Academic profiles cannot access departmental ledgers.');
    }
  
    // 2. Map their Department boundary directly to strict database IssueCategory enums
    let categoryFilter: any = {};
    
    if (staff.department === 'FINANCE') {
      categoryFilter = { category: 'FINANCIAL_GATEWAYS' };
    } else if (staff.department === 'REGISTRAR' || staff.department === 'FACULTY_HOD') {
      categoryFilter = { category: 'ACADEMIC_PROGRESSION_VERIFICATION' };
    } else if (staff.department === 'CAMPUS_OPERATIONS' || staff.department === 'ESTATE_MANAGEMENT') {
      categoryFilter = { category: 'ADMINISTRATIVE_OPERATIONAL_REQUESTS' };
    } else if (staff.department === 'GENERAL_SUPPORT') {
      categoryFilter = { category: 'DIRECT_SUPPORT_EXTERNAL_COMPLIANCE' };
    }
  
    // 3. Query the filtered ticket subset along with submitting student details
    return this.prisma.ticket.findMany({
      where: categoryFilter, // Applies target operational desk filtering restrictions
      include: {
        student: {
          select: {
            fullName: true,
            email: true,
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'asc', // Oldest unhandled claims float to the top to preserve SLAs
      },
    });
  }

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto, staffId: string) {
    // 1. Verify the targeted ticket record exists and pull down target mobile information
    const existingTicket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      // RECOVER TELEPHONY BOUNDARIES TO SEND SYSTEM NOTIFICATIONS OVER THE AIR
      include: {
        student: {
          select: { phoneNumber: true },
        },
      },
    });

    if (!existingTicket) {
      throw new NotFoundException(`No ticket found matching identifier: ${ticketId}`);
    }

    // 2. Enforce structural validation compliance
    if (dto.status === 'ACTION_REQUIRED' && (!dto.comment || dto.comment.trim() === '')) {
      throw new BadRequestException('A descriptive audit comment is mandatory when requesting action from a student.');
    }

    // 3. Wrap operations in a secure transaction block
    return this.prisma.$transaction(async (tx) => {
      // Step A: Update the primary ticket row status variable
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: { status: dto.status },
      });

      // Step B: Seed a clean row tracking log into the immutable audit history trail
      await tx.ticketHistory.create({
        data: {
          ticketId: ticketId,
          staffId: staffId, // Tracks the unique UUID of the officer who authorized this change
          previousState: existingTicket.status,
          newState: dto.status,
          comment: dto.comment || `Case tracking status transitioned to ${dto.status}.`,
        },
      });

      // STEP C: TRIGGER OFF-THREAD INFOBIP TELEPHONY ALERT DISPATCH LOGS
      if (existingTicket.student?.phoneNumber) {
        // Left unawaited on purpose so network latency from outside telco routing loops does not delay database connection lock release times
        this.smsService.sendStatusAlert(
          existingTicket.student.phoneNumber,
          existingTicket.trackingCode,
          dto.status
        );
      }

      return {
        message: 'Ticket status successfully updated and archived in the ledger.',
        ticketId: updatedTicket.id,
        newStatus: updatedTicket.status,
      };
    });
  }
}