import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { OrdersConsoleService } from './orders-console.service';

/**
 * A2 — Order Lifecycle Console.
 * One controller for every vertical; all mutations are permission-gated,
 * reason-mandatory and audit-logged inside the service.
 */
@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminOrdersConsoleController {
  constructor(private readonly svc: OrdersConsoleService) {}

  @Get()
  @RequirePermissions(Permission.ORDER_READ)
  list(
    @Query('kind') kind?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.svc.list({
      kind, q, status, from, to, sort,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Get(':kind/:id')
  @RequirePermissions(Permission.ORDER_READ)
  detail(@Param('kind') kind: string, @Param('id') id: string) {
    return this.svc.detail(kind, id);
  }

  @Post(':kind/:id/cancel')
  @RequirePermissions(Permission.ORDER_CANCEL)
  cancel(@Param('kind') kind: string, @Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    return this.svc.cancel(kind, id, b?.reason, me);
  }

  @Post(':kind/:id/refund')
  @RequirePermissions(Permission.ORDER_REFUND)
  refund(@Param('kind') kind: string, @Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    return this.svc.refund(kind, id, b || {}, me);
  }

  @Post(':kind/:id/compensate')
  @RequirePermissions(Permission.ORDER_COMPENSATE)
  compensate(@Param('kind') kind: string, @Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    return this.svc.compensate(kind, id, b || {}, me);
  }

  @Post(':kind/:id/reassign')
  @RequirePermissions(Permission.ORDER_REASSIGN)
  reassign(@Param('kind') kind: string, @Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    return this.svc.reassign(kind, id, b || {}, me);
  }

  @Post(':kind/:id/sla-extend')
  @RequirePermissions(Permission.ORDER_SLA_EXTEND)
  slaExtend(@Param('kind') kind: string, @Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    return this.svc.extendSla(kind, id, b || {}, me);
  }
}
