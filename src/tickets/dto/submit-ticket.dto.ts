import { IsEnum, IsString, IsNotEmpty, IsBooleanString } from 'class-validator';
import { IssueCategory } from '@prisma/client';

export class SubmitTicketDto {
  @IsEnum(IssueCategory, {
    message: 'Category must match one of the four blocks on your main layout.',
  })
  category: IssueCategory;

  @IsString()
  @IsNotEmpty({ message: 'Please specify the exact service target (e.g., SPECIAL_QUIZ).' })
  serviceName: string;

  @IsString()
  @IsNotEmpty({ message: 'Please provide a breakdown of your issue for administrative tracking.' })
  description: string;

  @IsBooleanString()
  isInternational: string; // Transmitted as string from multipart form data uploads
}