import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { MysteryShopperService } from './mystery-shopper.p22.service';
import {
  CreateMysteryShopAssignmentDto,
  SubmitMysteryShopFindingsDto,
} from './mystery-shopper.p22.dto';

/**
 * P22.12/Phase 1.1 — mystery-shopper admin API.
 * Admin UI wiring is out of scope; this is the API side.
 */
@Controller('admin/mystery-shopper')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class MysteryShopperController {
  constructor(private readonly svc: MysteryShopperService) {}

  @Post('assignments')
  createAssignment(@Body() body: CreateMysteryShopAssignmentDto) {
    return this.svc.createAssignment(body);
  }

  @Post('findings')
  submitFindings(@Body() body: SubmitMysteryShopFindingsDto) {
    return this.svc.submitFindings(body);
  }

  @Get('results')
  listResults(@Query('providerAccountId') providerAccountId?: string, @Query('limit') limit?: string) {
    return this.svc.listResults(providerAccountId, limit ? Number(limit) : 50);
  }
}
