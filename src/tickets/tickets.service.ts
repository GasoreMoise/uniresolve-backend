import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitTicketDto } from './dto/submit-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

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
          category: dto.category,
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
      throw new Error('Access denied. Academic profiles cannot access departmental ledgers.');
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
}
