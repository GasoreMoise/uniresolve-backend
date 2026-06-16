import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Adjust path if your PrismaService is elsewhere
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Logs a tamper-proof action into the database.
   */
  async logAction(
    action: string,
    entityName: string,
    entityId: string,
    actorId: string,
    payload: any, // The data being changed (e.g., { status: 'RESOLVED' })
  ) {
    // 1. Fetch the most recent audit log to get the previous hash
    const lastLog = await this.prisma.auditLog.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    // If this is the very first action in the system, create a "Genesis Hash"
    const previousHash = lastLog ? lastLog.currentHash : this.generateGenesisHash();

    // 2. Prepare the data to be hashed
    const timestamp = new Date();
    const dataString = JSON.stringify({
      action,
      entityName,
      entityId,
      actorId,
      payload,
      timestamp: timestamp.toISOString(),
      previousHash,
    });

    // 3. Generate the SHA-256 Hash
    const currentHash = crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');

    // 4. Save the immutable record to the database
    return this.prisma.auditLog.create({
      data: {
        action,
        entityName,
        entityId,
        actorId,
        previousHash,
        currentHash,
      },
    });
  }

  private generateGenesisHash(): string {
    return crypto.createHash('sha256').update('UNIRESOLVE_GENESIS_BLOCK').digest('hex');
  }
}
