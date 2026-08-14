import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

@Injectable()
export class CoturnService {
  private readonly logger = new Logger('CoturnService');
  private readonly coturnHost: string;
  private readonly coturnSecret: string;
  private readonly stunPort: number;
  private readonly turnPort: number;

  constructor() {
    this.coturnHost = process.env.COTURN_HOST || 'turn.example.com';
    this.coturnSecret = process.env.COTURN_SECRET || 'change_this_secret';
    this.stunPort = parseInt(process.env.COTURN_STUN_PORT || '3478', 10);
    this.turnPort = parseInt(process.env.COTURN_TURN_PORT || '3478', 10);
  }

  /**
   * Generate time-limited TURN credentials using HMAC-SHA1.
   * Compatible with Coturn's REST API auth (--use-auth-secret flag).
   * The username format `<expiry-timestamp>:<userId>` is the Coturn REST API standard.
   */
  generateCredentials(userId: string, ttlSeconds = 86400): TurnCredentials {
    const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = `${timestamp}:${userId}`;
    const credential = crypto
      .createHmac('sha1', this.coturnSecret)
      .update(username)
      .digest('base64');

    return {
      urls: [
        `stun:${this.coturnHost}:${this.stunPort}`,
        `turn:${this.coturnHost}:${this.turnPort}?transport=udp`,
        `turn:${this.coturnHost}:${this.turnPort}?transport=tcp`,
        `turns:${this.coturnHost}:5349?transport=tcp`,
      ],
      username,
      credential,
      ttl: ttlSeconds,
    };
  }

  /**
   * Returns a structured ICE server configuration object ready for WebRTC clients.
   * Separates the STUN entry (no auth needed) from TURN entries (auth required).
   */
  getIceServers(userId: string): {
    iceServers: Array<{ urls: string[]; username?: string; credential?: string }>;
  } {
    const creds = this.generateCredentials(userId);
    return {
      iceServers: [
        { urls: [`stun:${this.coturnHost}:${this.stunPort}`] },
        {
          urls: [
            `turn:${this.coturnHost}:${this.turnPort}?transport=udp`,
            `turn:${this.coturnHost}:${this.turnPort}?transport=tcp`,
            `turns:${this.coturnHost}:5349?transport=tcp`,
          ],
          username: creds.username,
          credential: creds.credential,
        },
      ],
    };
  }
}
