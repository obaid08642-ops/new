import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard, CurrentUser, Roles, SelfService } from '../../common/auth.guard';
import { StepUp } from '../../common/step-up.guard';
import { UserRole } from '../../common/enums';
import { CreateDto, DecideDto} from './returns.dto';

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

  @Get('provider/list')
  async providerList(@CurrentUser() user: any) {
    return this.returnsService.providerReturns(user.id);
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

  /** F23: returns timeline from order.state_history */
  @Get('timeline/:orderId')
  async timeline(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    return this.returnsService.getReturnTimeline(user.id, orderId);
  }

  @Get(':id')
  async getDetails(@Param('id') id: string, @CurrentUser() user: any) {
    return this.returnsService.getById(id, user.id, user.role);
  }

  // Q89: money decision — requires fresh step-up authentication.
  @StepUp()
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

  // Q89: money decision — requires fresh step-up authentication.
  @StepUp()
  @Post(':id/decide')
  decide(@Param('id') id: string, @Body() body: DecideDto, @CurrentUser() adminUser: any) {
    return this.returnsService.adminDecide(id, body.decision, body.note || '', adminUser);
  }
}
