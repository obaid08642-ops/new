import { Controller, Get, UseGuards, Query } from '@nestjs/common';
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

  @Get('upcoming-appointment')
  getUpcomingAppointment() {
    return this.homeService.getUpcomingAppointment();
  }

  @Get('search')
  globalSearch(@Query('q') query: string) {
    return this.homeService.globalSearch(query);
  }
}
