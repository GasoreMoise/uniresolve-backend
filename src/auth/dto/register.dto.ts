import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid university email address.' })
  email: string;

  @IsString()
  @IsOptional() // Made optional for frontend form variations where phone inputs are excluded
  phoneNumber?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'Account role is required.' })
  role: string; // Captures 'STUDENT' or 'STAFF' choices passed by your UI portal select box

  @IsString()
  @IsOptional() // ◄ Added to capture backend department desks (omitted safely by student identities)
  department?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid university email address.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  password: string;
}