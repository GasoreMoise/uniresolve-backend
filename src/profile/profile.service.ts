import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getStudentMasterProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true,
            grades: true,
          }
        },
        registeredModules: {
          include: {
            module: {
              include: { 
                lecturer: { select: { fullName: true, email: true } }
              }
            }
          }
        }
      }
    });

    if (!profile) {
      throw new NotFoundException('Academic profile registry not found for this user.');
    }

    return profile;
  }

  // ◄ NEW: Fetch all system users for the Admin IAM Dashboard
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: { 
        id: true, 
        fullName: true, 
        email: true, 
        role: true, 
        department: true,
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ◄ NEW: Update a user's role and department
  async updateUserRole(id: string, role: string, department: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { 
        role: role as any, 
        department: department as any 
      }
    });
  }
}