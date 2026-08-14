import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.svc.listForUser(user);
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
}
