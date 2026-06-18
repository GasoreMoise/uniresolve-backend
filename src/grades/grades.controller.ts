import { Controller, Post, Body, Param, UseGuards, Put, Get } from '@nestjs/common';
import { GradesService } from './grades.service';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUserId } from '../auth/decorators/get-user.decorator';

@Controller('grades')
@UseGuards(JwtAuthGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // ◄ NEW: Endpoint to fetch the professor's assigned class rosters
  @Get('roster')
  async getMyRoster(@GetUserId() lecturerId: string) {
    return this.gradesService.getLecturerRoster(lecturerId);
  }

  @Put('module/:moduleId/student/:studentId')
  async updateStudentMarks(
    @Param('moduleId') moduleId: string,
    @Param('studentId') studentId: string,
    @Body() payload: UpdateGradeDto,
    @GetUserId() lecturerId: string
  ) {
    return this.gradesService.processAndSaveGrade(studentId, moduleId, payload, lecturerId);
  }
}