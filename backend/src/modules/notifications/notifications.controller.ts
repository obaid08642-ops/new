import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { PushService } from '../push/push.module';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService, private push: PushService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.svc.listForUser(user);
  }

  /**
   * Device-token registration — the mobile apps call this after obtaining
   * their push token. Accepts { token, device|platform, provider }.
   * provider: expo | fcm | apns (auto-detected when omitted).
   */
  @Post('register-token')
  registerToken(@CurrentUser() user: any, @Body() body: { token: string; device?: string; platform?: string; provider?: string; device_id?: string; device_name?: string }) {
    if (!body?.token) throw new BadRequestException('token is required');
    const provider = body.provider
      || (body.token.startsWith('ExponentPushToken') ? 'expo' : (body.platform === 'ios' || body.device === 'ios' ? 'apns' : 'fcm'));
    return this.push.register(user, {
      token: body.token,
      provider,
      platform: body.platform || body.device,
      device_id: body.device_id,
      device_name: body.device_name,
    });
  }

  @Post(':id/read')
  read(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.markRead(id, user);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: any) {
    return this.svc.markAllRead(user);
  }

  @Post('admin/send')
  @Roles(UserRole.ADMIN)
  send(@Body() body: any) {
    return this.svc.create(body);
  }

  // M6/ER-8: admin — schedule a notification for future delivery
  @Post('admin/schedule')
  @Roles(UserRole.ADMIN)
  schedule(@Body() body: any) {
    if (!body?.scheduled_at) throw new BadRequestException('scheduled_at is required');
    return this.svc.create(body);
  }

  // M6/ER-8: admin — delivery status analytics
  @Get('admin/delivery-stats')
  @Roles(UserRole.ADMIN)
  deliveryStats() {
    return this.svc.deliveryStats();
  }
}
