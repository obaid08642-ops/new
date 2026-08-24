import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { EventBusService } from './event-bus.service';

@Controller('admin/events')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminEventsController {
  constructor(private bus: EventBusService) {}

  @Get()
  async list(
    @Query('type') type?: string,
    @Query('entity_type') entity_type?: string,
    @Query('entity_id') entity_id?: string,
    @Query('pharmacy_account_id') pharmacy_account_id?: string,
    @Query('patient_account_id') patient_account_id?: string,
    @Query('since_minutes') since_minutes?: string,
    @Query('limit') limit?: string,
  ) {
    const since = since_minutes ? new Date(Date.now() - parseInt(since_minutes, 10) * 60_000) : undefined;
    return this.bus.list({ type, entity_type, entity_id, pharmacy_account_id, patient_account_id, since, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('trace')
  async trace(@Query('entity_type') entity_type: string, @Query('entity_id') entity_id: string) {
    return this.bus.list({ entity_type, entity_id, limit: 500 });
  }
}
