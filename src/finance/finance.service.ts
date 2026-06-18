import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService, private auditService: AuditService) {}

  // 1. Fetch the master list of all students for the ledger
  async getMasterLedger(staffId: string) {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || staff.department !== 'FINANCE') {
      throw new BadRequestException('Unauthorized: Only Finance personnel can access the master ledger.');
    }

    return this.prisma.studentProfile.findMany({
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true } }
      },
      orderBy: { user: { fullName: 'asc' } }
    });
  }

  // 2. Manual toggle for financial clearance
  async toggleClearance(profileId: string, isCleared: boolean, staffId: string) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new BadRequestException('Student profile not found.');

    const updated = await this.prisma.studentProfile.update({
      where: { id: profileId },
      data: { isFinanciallyCleared: isCleared }
    });

    // Cryptographic audit log for accountability
    await this.auditService.logAction(
      isCleared ? 'MANUAL_FINANCE_CLEARANCE_GRANTED' : 'MANUAL_FINANCE_CLEARANCE_REVOKED',
      'StudentProfile',
      profileId,
      staffId,
      { previousState: profile.isFinanciallyCleared, newState: isCleared }
    );

    return updated;
  }
}
