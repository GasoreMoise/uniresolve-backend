import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 
import { RegisterDto, LoginDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
// ◄ IMPORT BOTH USERROLE AND DEPARTMENT ENUMS DIRECTLY FROM YOUR GENERATED PRISMA CLIENT
import { UserRole, Department } from '@prisma/client'; 

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const emailCheckCondition: any[] = [{ email: dto.email }];

    if (dto.phoneNumber) {
      emailCheckCondition.push({ phoneNumber: dto.phoneNumber });
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: emailCheckCondition,
      },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email or phone number already exists.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // Safely cast the incoming role string to the database enum profile
    const assignedRole = dto.role as UserRole;

    // ◄ SAFELY CAST THE INCOMING DTO DEPT STRING INTO THE PRISMA DEPARTMENT ENUM TYPE
    // If it's a student registering, it assigns null natively as structured in your schema
    const assignedDepartment = dto.department ? (dto.department as Department) : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phoneNumber: dto.phoneNumber || `NO_PHONE_${Date.now()}_${Math.round(Math.random() * 1000)}`, 
        passwordHash,
        fullName: dto.fullName,
        role: assignedRole, 
        department: assignedDepartment, // ◄ COMMITS THE ASSIGNED DESK TO YOUR MYSQL ENGINE
      },
    });

    return { message: 'Account successfully created.', userId: user.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    // ◄ INJECT DEPARTMENT METADATA INTO THE SIGNED STATELESS JWT PAYLOAD
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role, 
      department: user.department || '' 
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        department: user.department || '', // ◄ EXPORTS DESK KEY TO THE FRONTEND API CACHE WORKSPACE
      },
    };
  }
}