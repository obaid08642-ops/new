import { BadRequestException, Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { CareModule } from '../care/care.module';
import { AppointmentsService } from '../care/appointments.service';
import { HomeCareModule } from '../home-care/home-care.module';
import { HomeCareSvc } from '../home-care/home-care.service';

/**
 * GET /bookings/quote?kind=consultation|nursing&...: what a booking costs, stated by the server for every kind with the same shape
 * (`common/quote.ts`: lines, discount, subtotal, VAT, total, allowed methods). The booking charges by the same pricing function, so
 * the quote is the charge. The clients only display it.
 *   consultation: doctor_id, service_type (clinic | video | home)
 *   nursing:      service_id, provider_id, and the booking choice (booking_mode, sessions ...)
 * Lab and radiology are quoted by POST /ordering/quote (per provider, with home_fee, VAT and total on every row); a pharmacy order by the
 * selected offer (its pricing snapshot).
 * This replaces a stub that returned the `price` the caller sent; no client called it.
 */
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly appointments: AppointmentsService, private readonly homeCare: HomeCareSvc) {}

  @SelfService()
  @Get('quote')
  quote(@Query() q: Record<string, unknown>) {
    const kind = typeof q?.kind === 'string' ? q.kind : '';
    if (kind === 'consultation') return this.appointments.quote(q.doctor_id, q.service_type);
    if (kind === 'nursing') return this.homeCare.quote(q);
    if (kind === 'lab' || kind === 'radiology') throw new BadRequestException('use_ordering_quote');
    if (kind === 'pharmacy') throw new BadRequestException('use_pharmacy_offer_snapshot');
    throw new BadRequestException('kind_invalid');
  }
}

@Module({ imports: [CareModule, HomeCareModule], controllers: [QuotesController] })
export class QuotesModule {}
