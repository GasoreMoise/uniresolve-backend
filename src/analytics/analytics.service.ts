import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getExecutiveMetrics() {
    // 1. Gather issue volume distributions across your 4 layout categories
    const categoryDistribution = await this.prisma.ticket.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    // 2. Track global operational statuses across the state machine
    const statusVolume = await this.prisma.ticket.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // 3. Calculate processing bottlenecks (Average resolution time)
    // Compiles the millisecond difference between submission and resolution states
    const resolvedTickets = await this.prisma.ticketHistory.findMany({
      where: {
        newState: 'RESOLVED',
      },
      include: {
        ticket: true,
      },
    });

    const resolutionSpeeds = resolvedTickets.map((log) => {
      const durationMs = log.changedAt.getTime() - log.ticket.createdAt.getTime();
      return {
        category: log.ticket.category,
        durationDays: +(durationMs / (1000 * 60 * 60 * 24)).toFixed(2), // Convert to clean days
      };
    });

    return {
      categoryDistribution: categoryDistribution.map((item) => ({
        category: item.category,
        count: item._count.id,
      })),
      statusVolume: statusVolume.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
      resolutionSpeeds,
    };
  }
}
