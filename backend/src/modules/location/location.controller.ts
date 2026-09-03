import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LocationService } from './location.service';
import { Public } from '../../common/auth.guard';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Get('cities')
  async getCities() {
    return this.locationService.getCities();
  }

  @Public()
  @Get('districts')
  async getDistricts(@Query('city') cityCode?: string) {
    return this.locationService.getDistricts(cityCode);
  }

  @Public()
  @Post('resolve')
  async resolve(@Body('text') text: string) {
    return this.locationService.resolveFromText(text);
  }

  @Public()
  @Get(':code')
  async getByCode(@Param('code') code: string) {
    return this.locationService.findByCode(code);
  }
}
