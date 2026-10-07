import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActive: Date;
  isActive: boolean;
  refreshTokenHash?: string;
  pushToken?: string;
  revokedAt?: Date;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: string;
  ip?: string;
  userAgent?: string;
  pushToken?: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly REFRESH_TOKEN_BYTES = 64;
  private readonly REFRESH_TOKEN_TTL_DAYS = 14;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Create a new session with rotating refresh token
   */
  async createSession(userId: string, deviceInfo: DeviceInfo): Promise<{ sessionId: string; refreshToken: string }> {
    const sessionId = uuidv4();
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.connection.collection('sessions').insertOne({
      id: sessionId,
      user_id: userId,
      device_id: deviceInfo.deviceId,
      device_name: deviceInfo.deviceName,
      platform: deviceInfo.platform,
      ip: deviceInfo.ip,
      user_agent: deviceInfo.userAgent,
      push_token: deviceInfo.pushToken,
      created_at: new Date(),
      last_active: new Date(),
      is_active: true,
      refresh_token_hash: refreshTokenHash,
    });

    this.logger.log(`Created session ${sessionId} for user ${userId} on device ${deviceInfo.deviceId}`);
    return { sessionId, refreshToken };
  }

  /**
   * Rotate refresh token (issue new, invalidate old)
   */
  async rotateRefreshToken(sessionId: string, providedRefreshToken: string): Promise<{ sessionId: string; refreshToken: string } | null> {
    const session = await this.connection.collection('sessions').findOne({ id: sessionId });
    
    if (!session || !session.is_active) {
      return null;
    }

    // Verify provided refresh token
    const providedHash = this.hashToken(providedRefreshToken);
    if (session.refresh_token_hash !== providedHash) {
      // Token mismatch - potential theft, revoke session
      await this.revokeSession(sessionId);
      this.logger.warn(`Refresh token mismatch for session ${sessionId}, session revoked`);
      return null;
    }

    // Generate new refresh token
    const newRefreshToken = this.generateRefreshToken();
    const newHash = this.hashToken(newRefreshToken);

    await this.connection.collection('sessions').updateOne(
      { id: sessionId },
      { 
        $set: { 
          refresh_token_hash: newHash,
          last_active: new Date(),
        } 
      },
    );

    return { sessionId, refreshToken: newRefreshToken };
  }

  /**
   * List all signed-in devices for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const results = await this.connection.collection('sessions')
      .find({ user_id: userId, is_active: true })
      .sort({ last_active: -1 })
      .toArray();
    return results as unknown as Session[];
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.connection.collection('sessions').findOne({ id: sessionId });
    return result as unknown as Session | null;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.connection.collection('sessions').findOne({ id: sessionId });
    
    await this.connection.collection('sessions').updateOne(
      { id: sessionId },
      { 
        $set: { 
          is_active: false, 
          revoked_at: new Date(),
          refresh_token_hash: null,
          push_token: null,
        } 
      },
    );

    // Remove push token from user's device_tokens array
    if (session?.user_id) {
      await this.removePushTokenFromUser(session.user_id, session.push_token);
    }

    this.logger.log(`Revoked session ${sessionId}`);
  }

  /**
   * "Sign out other devices" - revoke all sessions except current
   */
  async revokeOtherSessions(userId: string, keepSessionId: string): Promise<number> {
    // Get sessions to revoke (for push token cleanup)
    const sessionsToRevoke = await this.connection.collection('sessions')
      .find({ user_id: userId, id: { $ne: keepSessionId }, is_active: true })
      .toArray();

    // Revoke sessions
    const result = await this.connection.collection('sessions').updateMany(
      { user_id: userId, id: { $ne: keepSessionId }, is_active: true },
      { 
        $set: { 
          is_active: false, 
          revoked_at: new Date(),
          refresh_token_hash: null,
          push_token: null,
        } 
      },
    );

    // Remove push tokens from user's device_tokens
    for (const session of sessionsToRevoke) {
      if (session.push_token) {
        await this.removePushTokenFromUser(userId, session.push_token);
      }
    }

    this.logger.log(`Revoked ${result.modifiedCount} other sessions for user ${userId}`);
    return result.modifiedCount;
  }

  /**
   * Revoke all sessions for a user (full sign out)
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const sessions = await this.connection.collection('sessions')
      .find({ user_id: userId, is_active: true })
      .toArray();

    const result = await this.connection.collection('sessions').updateMany(
      { user_id: userId, is_active: true },
      { 
        $set: { 
          is_active: false, 
          revoked_at: new Date(),
          refresh_token_hash: null,
          push_token: null,
        } 
      },
    );

    // Remove all push tokens
    for (const session of sessions) {
      if (session.push_token) {
        await this.removePushTokenFromUser(userId, session.push_token);
      }
    }

    return result.modifiedCount;
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(sessionId: string): Promise<void> {
    await this.connection.collection('sessions').updateOne(
      { id: sessionId },
      { $set: { last_active: new Date() } },
    );
  }

  /**
   * Update push token for a session
   */
  async updatePushToken(sessionId: string, pushToken: string): Promise<void> {
    await this.connection.collection('sessions').updateOne(
      { id: sessionId },
      { $set: { push_token: pushToken } },
    );

    // Also add to user's device_tokens for notification targeting
    const session = await this.connection.collection('sessions').findOne({ id: sessionId });
    if (session?.user_id) {
      await this.connection.collection('users').updateOne(
        { id: session.user_id },
        { $addToSet: { device_tokens: pushToken } },
      );
    }
  }

  /**
   * Remove push token from user's device_tokens array
   */
  private async removePushTokenFromUser(userId: string, pushToken?: string): Promise<void> {
    if (!pushToken) return;

    await this.connection.collection('users').updateOne(
      { id: userId },
      { $pull: { device_tokens: pushToken } } as any,
    );
  }

  /**
   * Generate cryptographically secure refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(this.REFRESH_TOKEN_BYTES).toString('base64url');
  }

  /**
   * Hash token for storage (SHA-256)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify refresh token without rotation (for validation)
   */
  async verifyRefreshToken(sessionId: string, refreshToken: string): Promise<boolean> {
    const session = await this.connection.collection('sessions').findOne({ id: sessionId });
    if (!session || !session.is_active || !session.refresh_token_hash) {
      return false;
    }
    const providedHash = this.hashToken(refreshToken);
    return session.refresh_token_hash === providedHash;
  }

  /**
   * Clean up expired sessions (older than REFRESH_TOKEN_TTL_DAYS)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const cutoff = new Date(Date.now() - this.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    
    const result = await this.connection.collection('sessions').updateMany(
      { 
        last_active: { $lt: cutoff },
        is_active: true,
      },
      { 
        $set: { 
          is_active: false, 
          revoked_at: new Date(),
          refresh_token_hash: null,
          push_token: null,
        } 
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Cleaned up ${result.modifiedCount} expired sessions`);
    }

    return result.modifiedCount;
  }
}