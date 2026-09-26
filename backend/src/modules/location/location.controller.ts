import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LocationService } from './location.service';
import { ResolveLocationDto } from './location.dto';
import { Public } from '../../common/auth.guard';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Get('regions')
  async getRegions() {
    return this.locationService.getRegions();
  }

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
  async resolve(@Body() body: ResolveLocationDto) {
    return this.locationService.resolveFromText(body.text);
  }

  @Public()
  @Get(':code')
  async getByCode(@Param('code') code: string) {
    return this.locationService.findByCode(code);
  }
}
