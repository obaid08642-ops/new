import { Controller, Get, UseGuards, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HomeService } from './home.service';
import { JwtAuthGuard, Public } from '../../common/auth.guard';

@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('offers')
  getOffers() {
    return this.homeService.getOffers();
  }

  /** 200 with the appointment, or 204 (no body) when there is none. */
  @Get('upcoming-appointment')
  async getUpcomingAppointment(@Res({ passthrough: true }) res: Response) {
    const appointment = await this.homeService.getUpcomingAppointment();
    if (!appointment) res.status(204);
    return appointment ?? undefined;
  }

  @Get('search')
  globalSearch(@Query('q') query: string) {
    return this.homeService.globalSearch(query);
  }
}
