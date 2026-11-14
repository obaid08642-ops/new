import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { PharmacyPriceReviewService } from './price-review.service';
import { PriceReviewListQuery, PriceReviewNoteDto, PriceReviewPenaltyDto, PriceReviewSuspendDto } from './price-review.dto';

/** Admin "Price reviews" (owner decision 2026-10-25): one row per offer line above the catalogue price, and what the admin did about it. */
@Controller('admin/pharmacy/price-reviews')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminPriceReviewController {
  constructor(private readonly svc: PharmacyPriceReviewService) {}

  @RequirePermissions(Permission.CATALOG_READ)
  @Get() list(@Query() q: PriceReviewListQuery) { return this.svc.list(q); }

  @RequirePermissions(Permission.CATALOG_READ)
  @Get(':id') one(@Param('id') id: string) { return this.svc.get(id); }

  @RequirePermissions(Permission.CATALOG_PRICE_WRITE)
  @Post(':id/update-catalogue') updateCatalogue(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PriceReviewNoteDto) { return this.svc.updateCatalogue(u, id, b.note); }

  @RequirePermissions(Permission.CATALOG_PRICE_WRITE)
  @Post(':id/dismiss') dismiss(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PriceReviewNoteDto) { return this.svc.dismiss(u, id, b.note); }

  @RequirePermissions(Permission.FACILITY_EDIT)
  @Post(':id/warn') warn(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PriceReviewNoteDto) { return this.svc.warn(u, id, b.note); }

  @RequirePermissions(Permission.FACILITY_EDIT)
  @Post(':id/suspend') suspend(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PriceReviewSuspendDto) { return this.svc.suspend(u, id, b.note, b.until); }

  @RequirePermissions(Permission.FACILITY_EDIT)
  @Post(':id/block') block(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PriceReviewNoteDto) { return this.svc.block(u, id, b.note); }

  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Post(':id/penalty') penalty(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PriceReviewPenaltyDto) { return this.svc.penalty(u, id, b.note, b.amount_sar); }
}
