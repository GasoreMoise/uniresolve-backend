import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        // Attempt to establish connection with the database container
        await this.$connect();
        this.logger.log('Database engine connection successfully secured.');
        break;
      } catch (error) {
        retries--;
        this.logger.warn(`Database socket busy. Retrying connection... (${retries} attempts remaining)`);
        if (retries === 0) {
          throw error;
        }
        // Wait 3 seconds before trying the connection handshake again
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}