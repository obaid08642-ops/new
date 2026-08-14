import { JwtAuthGuard } from '../../common/auth.guard';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { CurrentUser } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly svc: SupportService) {}
  @Post('requests') create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
  @Get('requests/mine') mine(@CurrentUser() u: any) { return this.svc.mine(u); }
  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(u, id); }
  @Post('requests/:id/reply') reply(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.reply(u, id, b.message); }

  // Admin endpoints (any authenticated user can hit but should be admin in future)
  @Get('admin/requests') adminList(@Query('status') status?: string) { return this.svc.adminList(status); }
  @Patch('admin/requests/:id') adminUpdate(@Param('id') id: string, @Body() b: any) { return this.svc.adminUpdateStatus(id, b.status, b.assigned_to); }

  // SETTINGS
  @Get('tickets')
  listTickets(@CurrentUser('id') id: string) {
    return this.svc.listTickets(id);
  }

  // --- WP 1.6 Settings Endpoints ---
  @Get('faqs')
  getFaqs() {
    return this.svc.getFaqs();
  }

  @Post('feedback')
  submitFeedback(@CurrentUser('id') id: string, @Body() body: any) {
    return this.svc.submitFeedback(id, body);
  }

  @Get('settings') get(@CurrentUser() u: any) { return this.svc.getSettings(u); }
  @Patch('settings') update(@CurrentUser() u: any, @Body() b: any) { return this.svc.updateSettings(u, b); }
}
