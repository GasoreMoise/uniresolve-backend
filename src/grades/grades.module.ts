import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // ◄ Import this

@Module({
  imports: [PrismaModule], // ◄ Add to imports
  controllers: [GradesController],
  providers: [GradesService],
})
export class GradesModule {}
