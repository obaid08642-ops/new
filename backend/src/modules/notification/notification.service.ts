import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async create(data: {
    user_id?: string;
    role?: string;
    title_key: string;
    body_key: string;
    params?: any;
    type?: any;
    priority?: any;
    action?: any;
  }) {
    return this.notificationsService.create(data);
  }

  async listForUser(user: any) {
    return this.notificationsService.listForUser(user);
  }

  async markRead(id: string, user: any) {
    return this.notificationsService.markRead(id, user);
  }

  async markAllRead(user: any) {
    return this.notificationsService.markAllRead(user);
  }
}
