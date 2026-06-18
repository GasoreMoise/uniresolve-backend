import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

// This allows us to tag routes like: @Roles(UserRole.STAFF, UserRole.LECTURER)
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);