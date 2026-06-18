import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async processAndSaveGrade(studentId: string, moduleId: string, payload: UpdateGradeDto, lecturerId: string) {
    // 1. Verify the lecturer actually teaches this module
    const moduleVerify = await this.prisma.module.findFirst({
      where: { id: moduleId, lecturerId: lecturerId }
    });

    if (!moduleVerify) {
      throw new BadRequestException('Unauthorized: You are not the assigned lecturer for this module.');
    }

    // 2. Compute Continuous Assessment (CA) - Scaled to 50%
    let totalEarnedCA = 0;
    let totalMaxCA = 0;

    const cats = payload.cats || [];
    const assignments = payload.assignments || [];
    const allAssessments = [...cats, ...assignments];

    allAssessments.forEach(assessment => {
      totalEarnedCA += assessment.score;
      totalMaxCA += assessment.max;
    });

    // Prevent division by zero
    const caComputed = totalMaxCA > 0 ? (totalEarnedCA / totalMaxCA) * 50 : 0;

    // 3. Compute Examination - Scaled to 50%
    let examComputed = 0;
    const examScore = payload.examScore ?? 0;
    const examMax = payload.examMax ?? 50;

    if (examMax > 0) {
      examComputed = (examScore / examMax) * 50;
    }

    // 4. Calculate Final Standing Score
    const finalScore = caComputed + examComputed;

    // 5. Upsert the Grade into the Ledger
    const gradeRecord = await this.prisma.grade.upsert({
      where: {
        studentId_moduleId: {
          studentId,
          moduleId,
        }
      },
      update: {
        cats: cats as any,
        assignments: assignments as any,
        examScore: payload.examScore,
        examMax: payload.examMax,
        caComputed: Math.round(caComputed * 100) / 100,
        examComputed: Math.round(examComputed * 100) / 100,
        finalScore: Math.round(finalScore * 100) / 100, // ◄ Removed the legacy 'score' line
        status: 'PUBLISHED'
      },
      create: {
        studentId,
        moduleId,
        cats: cats as any,
        assignments: assignments as any,
        examScore: payload.examScore,
        examMax: payload.examMax,
        caComputed: Math.round(caComputed * 100) / 100,
        examComputed: Math.round(examComputed * 100) / 100,
        finalScore: Math.round(finalScore * 100) / 100, // ◄ Removed the legacy 'score' line
        status: 'PUBLISHED'
      }
    });

    return gradeRecord;
  }

  async getLecturerRoster(lecturerId: string) {
    const modules = await this.prisma.module.findMany({
      where: { lecturerId },
      include: {
        registrations: {
          include: {
            studentProfile: {
              include: {
                user: { select: { id: true, fullName: true, email: true } }
              }
            }
          }
        },
        grades: true
      }
    });

    // Map the relational data into a clean structure for the frontend
    return modules.map(mod => ({
      id: mod.id,
      code: mod.code,
      title: mod.title,
      students: mod.registrations.map(reg => {
        const gradeRecord = mod.grades.find(g => g.studentId === reg.studentProfile.userId);
        return {
          userId: reg.studentProfile.userId,
          fullName: reg.studentProfile.user.fullName,
          registrationNumber: reg.studentProfile.registrationNumber,
          enrollmentType: reg.enrollmentType,
          grade: gradeRecord || null
        };
      })
    }));
  }
}