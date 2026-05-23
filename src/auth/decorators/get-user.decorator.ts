import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // Returns the sub (subject ID) or id property stored inside your signed JWT
    return request.user?.sub || request.user?.id; 
  },
);