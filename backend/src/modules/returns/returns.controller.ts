import { PROVIDER_ROLES } from '../../common/enums';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard, CurrentUser, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { CreateDto, DecideDto, ProviderRespondDto } from './returns.dto';

@Controller('pharmacy/returns')
@SelfService()
@UseGuards(JwtAuthGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() body: CreateDto) {
    return this.returnsService.createRequest(user.id, body);
  }

  @Get()
  async list(@CurrentUser() user: any) {
    return this.returnsService.myReturns(user.id);
  }

  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('provider/list')
  async providerList(@CurrentUser() user: any) {
    return this.returnsService.providerReturns(user.id);
  }

  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // P7: the pharmacy reads one of its returns
  @Get('provider/:id')
  async providerDetail(@Param('id') id: string, @CurrentUser() user: any) {
    return this.returnsService.providerReturnDetail(id, user.id);
  }

  @Roles(...PROVIDER_ROLES, 'provider') // P7: the pharmacy agrees or disputes; the admin decides the refund
  @Post('provider/:id/respond')
  async providerRespond(@Param('id') id: string, @Body() body: ProviderRespondDto, @CurrentUser() user: any) {
    return this.returnsService.providerRespond(id, user.id, body.agree, body.note);
  }

  /** E1 S5: pre-flight return eligibility for an order (window, categories). */
  @Get('eligibility/:orderId')
  async eligibility(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    return this.returnsService.eligibility(user.id, orderId);
  }

  /** LJ-05: server-eligible completed bookings for the return picker. */
  @Get('eligible/:serviceType')
  eligible(@Param('serviceType') serviceType: string, @CurrentUser() user: any) {
    return this.returnsService.eligibleBookings(user.id, serviceType);
  }

  @Get(':id')
  async getDetails(@Param('id') id: string, @CurrentUser() user: any) {
    return this.returnsService.getById(id, user.id, user.role);
  }

  @Post(':id/decide')
  @Roles(UserRole.ADMIN)
  async decide(
    @Param('id') id: string,
    @Body() body: DecideDto,
    @CurrentUser() adminUser: any,
  ) {
    return this.returnsService.adminDecide(id, body.decision, body.note || '', adminUser);
  }
}

@Controller('admin/returns')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.returnsService.adminList(status);
  }

  @Post(':id/decide')
  decide(@Param('id') id: string, @Body() body: DecideDto, @CurrentUser() adminUser: any) {
    return this.returnsService.adminDecide(id, body.decision, body.note || '', adminUser);
  }
}
