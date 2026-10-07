import { JwtAuthGuard, Roles, SelfService, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Controller, Delete, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateDto, CreateTicketDto, CreateSupportDto, ReplyDto, AdminUpdateDto, SupportSettingsDto, FaqUpsertDto, AiAssistDto, CallbackRequestDto } from './support.dto';

@UseGuards(JwtAuthGuard)
@Controller('support')
@SelfService()
export class SupportController {
  constructor(private readonly svc: SupportService) {}

  @Post('requests') create(@CurrentUser() u: any, @Body() b: CreateDto) { return this.svc.create(u, b); }

  // M2 alias: apps submit support tickets at /support/tickets (simple version)
  @Post('tickets') createTicket(@CurrentUser() u: any, @Body() b: CreateTicketDto) { return this.svc.create(u, b); }

  // Full-featured support request with SLA, order linking, callback
  @Post('tickets/full') createFull(@CurrentUser() u: any, @Body() b: CreateSupportDto) { 
    return this.svc.create(u, { 
      ...b, 
      callback_preferred_time: b.callback_preferred_time ? new Date(b.callback_preferred_time) : undefined, 
      linked_order_id: b.linked_order_id, 
      linked_booking_id: b.linked_booking_id 
    }); 
  }

  // AI Assistant - hands off to human when needed
  @Post('ai/assist') aiAssist(@CurrentUser() u: any, @Body() b: AiAssistDto) { return this.svc.aiAssist(u, b); }

  // "Call me back" feature
  @Post('callback') requestCallback(@CurrentUser() u: any, @Body() b: CallbackRequestDto) { 
    return this.svc.requestCallback(u, { 
      phone: b.phone, 
      preferred_time: b.preferred_time ? new Date(b.preferred_time) : undefined, 
      reason: b.reason 
    }); 
  }

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

  // WP 1.6 Settings Endpoints
  @Get('faqs')
  getFaqs() {
    return this.svc.getFaqs();
  }

  // P6.x-13: admin-managed FAQs.
  @Get('admin/faqs') @Roles(UserRole.ADMIN) faqsAdmin(): Promise<any[]> { return this.svc.listFaqsAdmin(); }
  @Post('admin/faqs') @Roles(UserRole.ADMIN) upsertFaq(@Body() b: FaqUpsertDto) { return this.svc.upsertFaq(b); }
  @Delete('admin/faqs/:id') @Roles(UserRole.ADMIN) deleteFaq(@Param('id') id: string) { return this.svc.deleteFaq(id); }

  @Post('feedback')
  submitFeedback(@CurrentUser('id') id: string) {
    return this.svc.submitFeedback(id);
  }

  @Get('settings') get(@CurrentUser() u: any) { return this.svc.getSettings(u); }
  @Patch('settings') update(@CurrentUser() u: any, @Body() b: SupportSettingsDto) { return this.svc.updateSettings(u, b); }
}
