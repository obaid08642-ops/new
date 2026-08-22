import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { TourService } from './tour.service';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tour')
export class TourController {
  constructor(private tourSvc: TourService) {}

  @Get('status')
  async getStatus(@CurrentUser('id') userId: string) {
    return this.tourSvc.getUserTourStatus(userId);
  }

  @Post('complete')
  async completeStep(@CurrentUser('id') userId: string, @Body('stepId') stepId: string) {
    return this.tourSvc.markStepComplete(userId, stepId);
  }
}
