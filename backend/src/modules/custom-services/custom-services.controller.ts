import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { CustomServicesService } from './custom-services.service';
import { CurrentUser } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('custom-services')
export class CustomServicesController {
  constructor(private readonly svc: CustomServicesService) {}

  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
  @Get('mine') mine(@CurrentUser() u: any, @Query('kind') k?: string) { return this.svc.mine(u, k); }
  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.one(u, id); }

  // Admin/provider list & status update
  @Get('admin/list') list(@Query('kind') k?: string, @Query('status') s?: string) { return this.svc.adminList(k, s); }
  @Patch('admin/:id/status') updateStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.updateStatus(u, id, b.status, b.note); }
}
