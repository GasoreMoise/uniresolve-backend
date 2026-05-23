import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid university email address.' })
  email: string;

  @IsString()
  // ◄ ENFORCED STRING REQUIREMENT TO LOCK IN DESTINATION SMS HANDSETS
  @IsNotEmpty({ message: 'Mobile phone registration number is mandatory.' }) 
  phoneNumber: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'Account role is required.' })
  role: string; 

  @IsString()
  @IsOptional() 
  department?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid university email address.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  password: string;
}