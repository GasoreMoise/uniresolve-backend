import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IssueCategory } from '@prisma/client';

@Injectable()
export class TriageService {
  private readonly ai: GoogleGenerativeAI;
  private readonly logger = new Logger(TriageService.name);

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY as string;
    if (!apiKey) {
      this.logger.error('CRITICAL: GEMINI_API_KEY is missing from environment variables!');
    }
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Reads a student's complaint and automatically maps it to the correct department.
   */
  async classifyIssue(description: string): Promise<IssueCategory> {
    try {
      // ◄ FIX: Appended '-latest' to bypass the v1beta endpoint resolution bug
      const model = this.ai.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `
        You are an intelligent university triage system for UNIRESOLVE.
        Read the following student issue description and classify it into EXACTLY ONE of the following categories:
        
        - ACADEMIC_PROGRESSION_VERIFICATION (e.g., grades, transcripts, missing marks, exam schedules, module registration)
        - ADMINISTRATIVE_OPERATIONAL_REQUESTS (e.g., ID cards, hostel issues, facility maintenance, campus operations)
        - FINANCIAL_GATEWAYS (e.g., tuition, scholarships, payment clearance, finance desk)
        - DIRECT_SUPPORT_EXTERNAL_COMPLIANCE (e.g., international student visas, medical emergencies, legal/general support)
        
        Issue Description: "${description}"
        
        Return ONLY the exact category string from the list above. Do not include quotes, markdown, periods, or any other text.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      if (Object.values(IssueCategory).includes(responseText as IssueCategory)) {
        this.logger.log(`AI successfully routed issue to: ${responseText}`);
        return responseText as IssueCategory;
      } else {
        this.logger.warn(`AI returned invalid category: ${responseText}. Defaulting to GENERAL_SUPPORT.`);
        return IssueCategory.DIRECT_SUPPORT_EXTERNAL_COMPLIANCE; 
      }
    } catch (error) {
      this.logger.error('Failed to classify issue with AI', error);
      return IssueCategory.DIRECT_SUPPORT_EXTERNAL_COMPLIANCE; 
    }
  }
}