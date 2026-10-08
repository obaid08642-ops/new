import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ServiceAreaService } from './service-area.service';
import { CityLaunchService } from './city-launch.service';
import { CoverageService } from './coverage.service';
import { CreateServiceAreaDto, SetLaunchSwitchDto, UpdateServiceAreaDto } from './city-ops.dto';

/**
 * P22.16 — city operations API (admin UI is another agent's slice).
 */
@Controller('admin/city-ops')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class CityOpsController {
  constructor(
    private readonly areas: ServiceAreaService,
    private readonly launches: CityLaunchService,
    private readonly coverage: CoverageService,
  ) {}

  @Post('service-areas')
  createArea(@Body() body: CreateServiceAreaDto) {
    return this.areas.create(body);
  }

  @Get('service-areas')
  listAreas(@Query('cityCode') cityCode?: string) {
    return this.areas.list(cityCode);
  }

  @Put('service-areas/:code')
  updateArea(@Param('code') code: string, @Body() body: UpdateServiceAreaDto) {
    return this.areas.update(code, body);
  }

  @Delete('service-areas/:code')
  removeArea(@Param('code') code: string) {
    return this.areas.remove(code);
  }

  @Post('launches')
  setLaunch(@Body() body: SetLaunchSwitchDto) {
    return this.launches.setSwitch(body);
  }

  @Get('launches/:cityCode')
  cityLaunches(@Param('cityCode') cityCode: string) {
    return this.launches.forCity(cityCode);
  }

  @Get('coverage/:cityCode')
  coverageByCity(@Param('cityCode') cityCode: string) {
    return this.coverage.byCity(cityCode);
  }

  @Get('coverage/:cityCode/summary')
  coverageSummary(@Param('cityCode') cityCode: string) {
    return this.coverage.citySummary(cityCode);
  }
}
