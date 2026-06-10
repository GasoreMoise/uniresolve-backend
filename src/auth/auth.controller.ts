import { Controller, Post, Get, Body, HttpCode, HttpStatus, ValidationPipe, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // ◄ Adjust this path to match your actual JWT guard file location

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(new ValidationPipe()) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ValidationPipe()) dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ◄ NEW: Exposes GET /api/auth/lecturers
  @UseGuards(JwtAuthGuard) 
  @Get('lecturers')
  @HttpCode(HttpStatus.OK)
  async getLecturersRegistry() {
    return this.authService.findActiveLecturers();
  }
}