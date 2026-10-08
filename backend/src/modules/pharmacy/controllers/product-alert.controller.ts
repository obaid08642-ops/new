import { Body, Controller, Delete, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { RequireIdempotency } from '../../../common/idempotency.interceptor';
import { UserRole } from '../../../common/enums';
import { ProductAlertService } from '../services/product-alert.service';
import { ReportPriceDto, ReportRestockDto, SubscribeAlertDto } from '../dto/product-alert.dto';

/** P22.2 — patient back-in-stock / price-drop alert subscriptions. */
@Controller('pharmacy/alerts')
@UseGuards(JwtAuthGuard)
export class ProductAlertController {
  constructor(private readonly svc: ProductAlertService) {}

  @Post('subscriptions')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @RequireIdempotency()
  subscribe(
    @CurrentUser() user: { id: string },
    @Body() body: SubscribeAlertDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.svc.subscribe(user.id, body, key);
  }

  @Get('subscriptions')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  mine(@CurrentUser() user: { id: string }) {
    return this.svc.list(user.id);
  }

  @Delete('subscriptions/:id')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  unsubscribe(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.svc.unsubscribe(user.id, id);
  }

  /** Price-pipeline hook: report a new price, fire met thresholds. */
  @Post('report-price')
  @Roles(UserRole.ADMIN)
  @RequireIdempotency()
  reportPrice(@Body() body: ReportPriceDto) {
    return this.svc.reportPrice(body.medicine_id, body.new_price, body.old_price);
  }

  /** Stock-pipeline hook (the provider restock path also calls this internally). */
  @Post('report-restock')
  @Roles(UserRole.ADMIN)
  @RequireIdempotency()
  reportRestock(@Body() body: ReportRestockDto) {
    return this.svc.onRestock({
      sku: body.sku,
      generic_name: body.generic_name,
      medicine_id: body.medicine_id,
    });
  }
}
