import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async createSession(userId: string, deviceInfo: any): Promise<string> {
    const sessionId = uuidv4();
    await this.connection.collection('sessions').insertOne({
      id: sessionId,
      user_id: userId,
      device_id: deviceInfo.deviceId,
      device_name: deviceInfo.deviceName,
      platform: deviceInfo.platform,
      ip: deviceInfo.ip,
      user_agent: deviceInfo.userAgent,
      created_at: new Date(),
      last_active: new Date(),
      is_active: true,
    });
    return sessionId;
  }

  async getUserSessions(userId: string): Promise<any[]> {
    return this.connection.collection('sessions')
      .find({ user_id: userId, is_active: true })
      .sort({ last_active: -1 })
      .toArray();
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.connection.collection('sessions').updateOne(
      { id: sessionId },
      { $set: { is_active: false, revoked_at: new Date() } },
    );
  }

  async revokeOtherSessions(userId: string, keepSessionId: string): Promise<void> {
    await this.connection.collection('sessions').updateMany(
      { user_id: userId, id: { $ne: keepSessionId }, is_active: true },
      { $set: { is_active: false, revoked_at: new Date() } },
    );
  }

  async updateLastActive(sessionId: string): Promise<void> {
    await this.connection.collection('sessions').updateOne(
      { id: sessionId },
      { $set: { last_active: new Date() } },
    );
  }
}
