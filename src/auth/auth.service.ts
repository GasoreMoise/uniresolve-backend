import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 
import { RegisterDto, LoginDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserRole, Department } from '@prisma/client'; 

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // ◄ FORMATS INCOMING TEXT STRINGS INTO AN INTERNATIONAL PHONE NUMBER FOR TWILIO
    const formattedPhoneNumber = `+250${dto.phoneNumber.trim()}`;

    // Validates against unique row clashes inside the database model configuration fields
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { phoneNumber: formattedPhoneNumber } // Compares formatted suffix
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email or phone number already exists.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const assignedRole = dto.role as UserRole;
    const assignedDepartment = dto.department ? (dto.department as Department) : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phoneNumber: formattedPhoneNumber, // ◄ WRITES TRUE TELEPHONY KEYS SECURELY TO THE RECORD
        passwordHash,
        fullName: dto.fullName,
        role: assignedRole, 
        department: assignedDepartment, 
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
        department: user.department || '', 
      },
    };
  }
}