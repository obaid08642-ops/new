import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, JwtAuthGuard, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { PushService } from '../push/push.module';
import { SendDto, ScheduleDto, RegisterTokenDto, TemplateUpsertDto, TemplatePreviewDto} from './notifications.dto';

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
  @SelfService()
  @Post('register-token')
  registerToken(@CurrentUser() user: any, @Body() body: RegisterTokenDto) {
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

  @SelfService()
  @Post(':id/read')
  read(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.markRead(id, user);
  }

  @SelfService()
  @Post('read-all')
  readAll(@CurrentUser() user: any) {
    return this.svc.markAllRead(user);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/send')
  @Roles(UserRole.ADMIN)
  send(@Body() body: SendDto) {
    return this.svc.create(body);
  }

  // M6/ER-8: admin — schedule a notification for future delivery
  @Roles(UserRole.ADMIN)
  @Post('admin/schedule')
  @Roles(UserRole.ADMIN)
  schedule(@Body() body: ScheduleDto) {
    if (!body?.scheduled_at) throw new BadRequestException('scheduled_at is required');
    return this.svc.create(body);
  }

  // M6/ER-8: admin — delivery status analytics
  @Get('admin/delivery-stats')
  @Roles(UserRole.ADMIN)
  deliveryStats() {
    return this.svc.deliveryStats();
  }

  // P6.x-7: admin — notification templates (6 languages) + preview + test send
  @Get('admin/templates')
  @Roles(UserRole.ADMIN)
  templates() {
    return this.svc.listTemplates();
  }

  @Post('admin/templates')
  @Roles(UserRole.ADMIN)
  upsertTemplate(@CurrentUser() u: any, @Body() b: TemplateUpsertDto) {
    return this.svc.upsertTemplate(u, b);
  }

  @Post('admin/templates/:key/preview')
  @Roles(UserRole.ADMIN)
  previewTemplate(@Param('key') key: string, @Body() b: TemplatePreviewDto) {
    return this.svc.previewTemplate(key, b?.lang || 'ar', b?.params || {});
  }

  @Post('admin/templates/:key/test-send')
  @Roles(UserRole.ADMIN)
  testSendTemplate(@CurrentUser() u: any, @Param('key') key: string, @Body() b: TemplatePreviewDto) {
    return this.svc.testSendTemplate(u, key, b?.lang || 'ar', b?.params || {});
  }
}
