import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MedicalReportsService } from './medical-reports.service';
import { CurrentUser } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('medical-reports')
export class MedicalReportsController {
  constructor(private readonly svc: MedicalReportsService) {}

  @Get('mine')
  mine(@CurrentUser() user: any, @Query('type') type?: string, @Query('q') q?: string, @Query('limit') limit?: string) {
    return this.svc.list(user, { type, q, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('track/:trackingId')
  track(@CurrentUser() user: any, @Param('trackingId') tracking: string) {
    return this.svc.byTracking(tracking, user);
  }

  @Get(':id')
  one(@CurrentUser() user: any, @Param('id') id: string) { return this.svc.one(user, id); }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) { return this.svc.create(user, body); }
}
