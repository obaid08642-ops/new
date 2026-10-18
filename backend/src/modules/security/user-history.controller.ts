import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { UserHistoryService } from './user-history.service';

/** 23.6 — a person's own history. Every route is scoped to the caller; there is no id of a user in any path. */
@Controller('me/history')
@SelfService()
@UseGuards(JwtAuthGuard)
export class UserHistoryController {
  constructor(private readonly history: UserHistoryService) {}

  /** Sign-ins, failed sign-ins, password and device changes, consent: the caller's own. */
  @Get('activity')
  activity(@CurrentUser('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.history.activity(id, Number(page) || 1, Number(limit) || 30);
  }

  /** The steps of one of the caller's orders or bookings (as patient or as the serving provider). */
  @Get(':kind/:id')
  status(@CurrentUser() user: { id: string; role?: string }, @Param('kind') kind: string, @Param('id') id: string) {
    return this.history.statusHistory(user, kind, id);
  }
}
