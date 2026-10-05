// 2ef3a3e live: POST /engagement/events answered 403 role_declaration_missing
// for every client, because the route had no access declaration and the
// global WriteGuard denies undeclared writes. The event records the signed-in
// user's own interest (user_id from the token), so it is @SelfService.
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { WriteGuard } from '../../common/write-guard';
import { JwtAuthGuard, PUBLIC_KEY } from '../../common/auth.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EngagementController } from './engagement.controller';

function ctxFor(handler: (...a: never[]) => unknown, cls: unknown = EngagementController) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method: 'POST' }) }),
    getHandler: () => handler,
    getClass: () => cls,
  } as never;
}

describe('POST engagement/events passes the global WriteGuard', () => {
  const guard = new WriteGuard(new Reflector());

  it('is declared, so a signed-in patient is not refused with role_declaration_missing', () => {
    expect(guard.canActivate(ctxFor(EngagementController.prototype.trackEvent as never))).toBe(true);
  });

  it('stays a signed-in route (JwtAuthGuard, not @Public)', () => {
    const reflector = new Reflector();
    const handler = EngagementController.prototype.trackEvent;
    expect(reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [handler, EngagementController])).toBeFalsy();
    expect(Reflect.getMetadata(GUARDS_METADATA, EngagementController)).toContain(JwtAuthGuard);
  });

  it('an undeclared write on the same guard is still refused (guard is live)', () => {
    class Undeclared { write() { return null; } }
    expect(() => guard.canActivate(ctxFor(Undeclared.prototype.write as never, Undeclared))).toThrow(ForbiddenException);
  });
});
