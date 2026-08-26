import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { LabResultsService } from './lab-results.service';
import { CurrentUser } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('lab-results')
export class LabResultsController {
  constructor(private readonly svc: LabResultsService) {}
  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.mineFor(u); }
  @Get('by-booking/:bid') byBkg(@CurrentUser() u: any, @Param('bid') bid: string) { return this.svc.byBooking(u, bid); }
  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.one(u, id); }
}
