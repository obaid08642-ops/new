import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { UserRole } from '../../common/enums';
import { WishlistShareService } from './wishlist-share.service';
import { ShareWishlistDto } from './wishlist.dto';

/** P22.2 — owner-side share management (authenticated). */
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistShareController {
  constructor(private readonly svc: WishlistShareService) {}

  @Post('share')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @RequireIdempotency()
  share(@CurrentUser() user: { id: string }, @Body() body: ShareWishlistDto) {
    return this.svc.createShare(user.id, body.item_ids);
  }

  @Get('shares')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  shares(@CurrentUser() user: { id: string }) {
    return this.svc.listMine(user.id);
  }

  @Delete('shares/:token')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  revoke(@CurrentUser() user: { id: string }, @Param('token') token: string) {
    return this.svc.revoke(user.id, token);
  }
}

/**
 * Public resolve path — NO auth guard by design (share links open for
 * recipients). Returns the frozen item snapshot only; never owner identity.
 */
@Controller('wishlist/shared')
export class WishlistSharedResolveController {
  constructor(private readonly svc: WishlistShareService) {}

  @Get(':token')
  resolve(@Param('token') token: string) {
    return this.svc.resolve(token);
  }
}
