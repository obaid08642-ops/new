import { JwtAuthGuard, Roles, SelfService, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateDto, CreateTicketDto, ReplyDto, AdminUpdateDto, SupportSettingsDto } from './support.dto';

@UseGuards(JwtAuthGuard)
@Controller('support')
@SelfService()
export class SupportController {
  constructor(private readonly svc: SupportService) {}
  @Post('requests') create(@CurrentUser() u: any, @Body() b: CreateDto) { return this.svc.create(u, b); }
  // M2 alias: apps submit support tickets at /support/tickets
  @Post('tickets') createTicket(@CurrentUser() u: any, @Body() b: CreateTicketDto) { return this.svc.create(u, b); }
  @Get('requests/mine') mine(@CurrentUser() u: any) { return this.svc.mine(u); }
  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(u, id); }
  @Post('requests/:id/reply') reply(@CurrentUser() u: any, @Param('id') id: string, @Body() b: ReplyDto) { return this.svc.reply(u, id, b.message); }

  // Admin endpoints — M5: role-restricted (was open to any authenticated user)
  @Get('admin/requests') @Roles(UserRole.ADMIN) adminList(@Query('status') status?: string) { return this.svc.adminList(status); }
  @Patch('admin/requests/:id') @Roles(UserRole.ADMIN) adminUpdate(@Param('id') id: string, @Body() b: AdminUpdateDto) { return this.svc.adminUpdateStatus(id, b.status, b.assigned_to); }

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
  submitFeedback(@CurrentUser('id') id: string) {
    return this.svc.submitFeedback(id);
  }

  @Get('settings') get(@CurrentUser() u: any) { return this.svc.getSettings(u); }
  @Patch('settings') update(@CurrentUser() u: any, @Body() b: SupportSettingsDto) { return this.svc.updateSettings(u, b); }
}
