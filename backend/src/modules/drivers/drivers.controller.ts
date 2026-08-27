import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private svc: DriversService) {}

  @Post('online')
  @Roles(UserRole.DELIVERY)
  online(@CurrentUser() driver: any, @Body() body: { location?: { lat: number; lng: number } }) {
    return this.svc.goOnline(driver, body?.location);
  }

  @Post('offline')
  @Roles(UserRole.DELIVERY)
  offline(@CurrentUser() driver: any) {
    return this.svc.goOffline(driver);
  }

  @Get('shift')
  @Roles(UserRole.DELIVERY)
  shift(@CurrentUser('id') id: string) {
    return this.svc.getCurrentShift(id);
  }

  @Post('location')
  @Roles(UserRole.DELIVERY)
  location(@CurrentUser() driver: any, @Body() body: { lat: number; lng: number; heading?: number; speed?: number }) {
    return this.svc.updateLocation(driver, body);
  }

  @Get(':driverId/location')
  getDriverLocation(@Param('driverId') driverId: string) {
    return this.svc.getDriverLocation(driverId);
  }

  @Get('orders/available')
  @Roles(UserRole.DELIVERY)
  available(@CurrentUser() driver: any) {
    return this.svc.availableOrders(driver);
  }

  @Get('orders/active')
  @Roles(UserRole.DELIVERY)
  active(@CurrentUser() driver: any) {
    return this.svc.myActive(driver);
  }

  @Get('orders/history')
  @Roles(UserRole.DELIVERY)
  history(@CurrentUser() driver: any) {
    return this.svc.myHistory(driver);
  }

  @Post('orders/:id/accept')
  @Roles(UserRole.DELIVERY)
  accept(@CurrentUser() driver: any, @Param('id') id: string) {
    return this.svc.acceptOrder(driver, id);
  }

  @Post('orders/:id/pickup')
  @Roles(UserRole.DELIVERY)
  pickup(@CurrentUser() driver: any, @Param('id') id: string) {
    return this.svc.pickupOrder(driver, id);
  }

  @Post('orders/:id/deliver')
  @Roles(UserRole.DELIVERY)
  deliver(@CurrentUser() driver: any, @Param('id') id: string, @Body() body: { signature?: string; photo?: string }) {
    return this.svc.deliverOrder(driver, id, body);
  }

  // Admin view
  @Get('admin/online')
  @Roles(UserRole.ADMIN)
  allOnline() {
    return this.svc.allOnline();
  }

  /** Pharmacy/Admin: list available drivers (online + not on active delivery). */
  @Get('available')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  listAvailable() {
    return this.svc.allOnline();
  }
}
