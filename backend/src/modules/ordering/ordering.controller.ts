import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { CreateOrderingBookingDto, QuoteDto, WindowsQueryDto } from './ordering.dto';
import { OrderingService } from './ordering.service';

// M3: the patient's ordering engine. Patient tokens only; every query is scoped to the caller (the quote is theirs).
@Controller('ordering')
@Roles(UserRole.PATIENT)
export class OrderingController {
  constructor(private readonly svc: OrderingService) {}

  @Post('quote') @HttpCode(200) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  quote(@CurrentUser() u: { id: string }, @Body() body: QuoteDto) { return this.svc.quote(u, body); }

  @Get('windows') @Throttle({ default: { limit: 60, ttl: 60_000 } })
  windows(@Query() q: WindowsQueryDto) { return this.svc.windows(q); }

  @Post('bookings') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  book(@CurrentUser() u: any, @Body() body: CreateOrderingBookingDto) { return this.svc.book(u, body); }
}
