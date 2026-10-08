import { Module } from '@nestjs/common';
import { WishlistShareService } from './wishlist-share.service';
import {
  WishlistShareController,
  WishlistSharedResolveController,
} from './wishlist.controller';

/**
 * P22.2 — shareable wishlists.
 * NOTE (orchestrator): register WishlistModule in app.module.ts imports.
 */
@Module({
  controllers: [WishlistShareController, WishlistSharedResolveController],
  providers: [WishlistShareService],
  exports: [WishlistShareService],
})
export class WishlistModule {}
