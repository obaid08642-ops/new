import { BadRequestException, Controller, Get, NotFoundException, Query, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { NATIONAL_ADDRESS_DESCRIPTION } from './national-address.docs';
import { NationalAddressService } from './national-address.service';

@ApiTags('Addresses')
@Controller('national-address')
@SelfService()
@UseGuards(JwtAuthGuard)
export class NationalAddressController {
  constructor(private readonly national: NationalAddressService) {}

  @Get('lookup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Look a Saudi National Address short code up', description: NATIONAL_ADDRESS_DESCRIPTION })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async lookup(@Query('code') code?: string) {
    const found = await this.national.lookup(code);
    if (found.outcome === 'invalid') throw new BadRequestException('short_address_invalid');
    if (found.outcome === 'not_found') throw new NotFoundException('short_address_not_found');
    if (found.outcome === 'unavailable') throw new ServiceUnavailableException('national_address_unavailable');
    return found.address;
  }
}
