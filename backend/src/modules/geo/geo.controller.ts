import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { ReverseGeocodeQueryDto } from './geo.dto';
import { GeoService } from './geo.service';

@ApiTags('Geo')
@Controller('geo')
@SelfService()
@UseGuards(JwtAuthGuard)
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('reverse')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Address of a map point: city and district (always ours), street, building, postal code, short address' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  reverse(@Query() q: ReverseGeocodeQueryDto) {
    return this.geo.reverse({ lat: q.lat, lng: q.lng });
  }
}
