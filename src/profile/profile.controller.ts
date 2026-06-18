import { Controller, Get, UseGuards, Param, Patch,Body } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUserId } from '../auth/decorators/get-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async getMyProfile(@GetUserId() userId: string) {
    return this.profileService.getStudentMasterProfile(userId);
  }

  @Get('users')
  async getAllUsers() {
    return this.profileService.getAllUsers();
  }

  // ◄ NEW: Change User Role
  @Patch('users/:id/role')
  async updateRole(
    @Param('id') id: string, 
    @Body() payload: { role: string; department: string | null }
  ) {
    return this.profileService.updateUserRole(id, payload.role, payload.department);
  }
}
