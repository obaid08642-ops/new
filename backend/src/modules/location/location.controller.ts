import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LocationService } from './location.service';
import { ResolveLocationDto } from './location.dto';
import { Public } from '../../common/auth.guard';
import { PublicCache } from '../../common/cache/public-cache.decorator';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @PublicCache(3600, ['geo'])
  @Get('regions')
  async getRegions() {
    return this.locationService.getRegions();
  }

  @Public()
  @PublicCache(3600, ['geo'])
  @Get('cities')
  async getCities() {
    return this.locationService.getCities();
  }

  @Public()
  @PublicCache(3600, ['geo'])
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
  @PublicCache(3600, ['geo'])
  @Get(':code')
  async getByCode(@Param('code') code: string) {
    return this.locationService.findByCode(code);
  }
}
