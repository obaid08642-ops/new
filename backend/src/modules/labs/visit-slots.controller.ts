import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { VisitSlotsService } from './visit-slots.service';
import { CreateVisitSlotDto, ListVisitSlotsDto, BookVisitSlotDto } from './visit-slots.dto';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('labs/slots')
@UseGuards(JwtAuthGuard)
export class VisitSlotsController {
  constructor(private readonly svc: VisitSlotsService) {}

  /** Bookable windows are public — the product page shows them pre-login. */
  @Public()
  @Get()
  list(@Query() q: ListVisitSlotsDto) {
    return this.svc.listSlots({ city: q.city, date: q.date, provider_account_id: q.provider_account_id });
  }

  @Post()
  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  create(@CurrentUser() user: { id: string; role: string }, @Body() body: CreateVisitSlotDto) {
    return this.svc.createSlot(user, body);
  }

  @Post(':id/book')
  book(
    @CurrentUser() user: { id: string; role: string },
    @Param('id') id: string,
    @Body() body: BookVisitSlotDto,
  ) {
    return this.svc.bookSlot(user, id, body.idempotency_key);
  }

  @Post('holds/:holdId/release')
  release(@CurrentUser() user: { id: string; role: string }, @Param('holdId') holdId: string) {
    return this.svc.releaseSlot(user, holdId);
  }
}
