import { logger } from '../../../services/Logger';
import { AppNotification } from '../../domain/entities';
import { RepositoryRegistry } from '../../../data/repositories/RepositoryRegistry';
import { QuerySpecification } from '../../../data/repositories/core/QuerySpecification';
import { IBaseEntity } from '../../../data/repositories/interfaces/IRepository';

export interface NotificationEntity extends IBaseEntity {
  user_id: string;
  title: string;
  body: string;
  is_read: number;
}

export class NotificationCenterManager {
  private log = logger.scope('NotificationCenterManager');

  private getRepository() {
    return RepositoryRegistry.get<NotificationEntity>('notifications');
  }

  public async getNotifications(userId: string, limit = 50, offset = 0): Promise<AppNotification[]> {
    this.log.debug(`Fetching notifications for ${userId}`);
    const repo = this.getRepository();
    const spec = QuerySpecification.create().where('user_id', userId);
    // In a real app we'd add offset/limit to QuerySpecification
    
    const dbNotifs = await repo.match(spec);
    
    return dbNotifs.slice(offset, offset + limit).map(db => ({
      id: db.id,
      userId: db.user_id,
      title: db.title,
      body: db.body,
      isRead: db.is_read === 1,
      createdAt: new Date(db.created_at || Date.now()),
      updatedAt: new Date(db.updated_at || Date.now()),
      type: 'system',
      priority: 'normal'
    }));
  }

  public async markAsRead(notificationId: string): Promise<void> {
    this.log.info(`Marking notification ${notificationId} as read`);
    const repo = this.getRepository();
    await repo.update(notificationId, { is_read: 1 });
  }

  public async markAllAsRead(userId: string): Promise<void> {
    this.log.info(`Marking all notifications for ${userId} as read`);
    const repo = this.getRepository();
    const spec = QuerySpecification.create().where('user_id', userId).where('is_read', 0);
    const unread = await repo.match(spec);
    
    for (const notif of unread) {
      await repo.update(notif.id, { is_read: 1 });
    }
  }

  public async getUnreadCount(userId: string): Promise<number> {
    const repo = this.getRepository();
    const spec = QuerySpecification.create().where('user_id', userId).where('is_read', 0);
    const unread = await repo.match(spec);
    return unread.length;
  }

  public async archive(notificationId: string): Promise<void> {
    this.log.info(`Archived notification ${notificationId}`);
    const repo = this.getRepository();
    await repo.delete(notificationId, true); // Soft delete
  }
}
