import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // ◄ Import the official NestJS JWT library
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    // ◄ Configure and register the JwtService within this specific module context
    JwtModule.register({
      global: true, // Makes JwtService available everywhere without re-importing
      secret: process.env.JWT_SECRET || 'UTAB_SECURITY_COMPLIANCE_KEY_2026', // Fallback signature key
      signOptions: { expiresIn: '1d' }, // Token expiration window
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
