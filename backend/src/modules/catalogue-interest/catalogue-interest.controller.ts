import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { CatalogueInterestService } from './catalogue-interest.service';
import { INTEREST_SERVICE_TYPES, InterestDto, type InterestServiceType } from './catalogue-interest.dto';

const typeOf = (t: string): InterestServiceType => {
  if (!(INTEREST_SERVICE_TYPES as readonly string[]).includes(t)) throw new BadRequestException('service_type_invalid');
  return t as InterestServiceType;
};

/** "Notify me when available" on a catalogue service no provider offers yet (lab, radiology, nursing). Signed-in patients only. */
@Controller('catalogue-interest')
@UseGuards(JwtAuthGuard)
export class CatalogueInterestController {
  constructor(private readonly svc: CatalogueInterestService) {}

  @SelfService()
  @Post()
  add(@Body() body: InterestDto, @CurrentUser() user: any) { return this.svc.add(user.id, body.service_type, body.service_id); }

  @SelfService()
  @Delete(':type/:id')
  remove(@Param('type') type: string, @Param('id') id: string, @CurrentUser() user: any) { return this.svc.remove(user.id, typeOf(type), id); }

  @SelfService()
  @Get('mine')
  mine(@CurrentUser() user: any) { return this.svc.mine(user.id); }
}

/** The owner's view of the demand per service. */
@Controller('admin/catalogue-interest')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminCatalogueInterestController {
  constructor(private readonly svc: CatalogueInterestService) {}

  @Get()
  demand(@Query('service_type') type?: string) { return this.svc.demand(type ? typeOf(type) : undefined); }
}
