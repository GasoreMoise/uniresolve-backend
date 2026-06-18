import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUserId } from '../auth/decorators/get-user.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('ledger')
  async getLedger(@GetUserId() staffId: string) {
    return this.financeService.getMasterLedger(staffId);
  }

  @Patch('clearance/:profileId')
  async toggleClearance(
    @Param('profileId') profileId: string,
    @Body('isCleared') isCleared: boolean,
    @GetUserId() staffId: string
  ) {
    return this.financeService.toggleClearance(profileId, isCleared, staffId);
  }
}
