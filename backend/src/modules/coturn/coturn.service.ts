import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
  realm?: string;
}

@Injectable()
export class CoturnService {
  private readonly logger = new Logger('CoturnService');
  private readonly coturnHost: string;
  private readonly coturnSecret: string;
  private readonly stunPort: number;
  private readonly turnPort: number;

  private readonly turnRealm: string;
  private readonly customUrls: string[] | null;

  constructor() {
    this.coturnHost = process.env.COTURN_HOST || 'turn.example.com';
    this.coturnSecret = process.env.COTURN_SECRET || 'change_this_secret';
    this.stunPort = parseInt(process.env.COTURN_STUN_PORT || '3478', 10);
    this.turnPort = parseInt(process.env.COTURN_TURN_PORT || '3478', 10);
    // TURN realm — must match the `realm=` directive in turnserver.conf
    this.turnRealm = process.env.TURN_REALM || process.env.COTURN_REALM || 'nabdahplus';
    // Full override: comma-separated ICE URLs (e.g. "stun:turn.example.com:3478,turn:turn.example.com:3478?transport=udp")
    this.customUrls = process.env.TURN_URLS
      ? process.env.TURN_URLS.split(',').map((u) => u.trim()).filter(Boolean)
      : null;
  }

  /** ICE URL list — custom TURN_URLS override or the standard derived set. */
  private iceUrls(): string[] {
    if (this.customUrls) return this.customUrls;
    return [
      `stun:${this.coturnHost}:${this.stunPort}`,
      `turn:${this.coturnHost}:${this.turnPort}?transport=udp`,
      `turn:${this.coturnHost}:${this.turnPort}?transport=tcp`,
      `turns:${this.coturnHost}:5349?transport=tcp`,
    ];
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
      urls: this.iceUrls(),
      username,
      credential,
      ttl: ttlSeconds,
      realm: this.turnRealm,
    };
  }

  /**
   * Returns a structured ICE server configuration object ready for WebRTC clients.
   * Separates the STUN entry (no auth needed) from TURN entries (auth required).
   */
  getIceServers(userId: string): {
    iceServers: Array<{ urls: string[]; username?: string; credential?: string }>;
    realm: string;
  } {
    const creds = this.generateCredentials(userId);
    const urls = this.iceUrls();
    const stunUrls = urls.filter((u) => u.startsWith('stun:'));
    const turnUrls = urls.filter((u) => !u.startsWith('stun:'));
    return {
      iceServers: [
        { urls: stunUrls.length ? stunUrls : [`stun:${this.coturnHost}:${this.stunPort}`] },
        {
          urls: turnUrls.length ? turnUrls : [`turn:${this.coturnHost}:${this.turnPort}?transport=udp`],
          username: creds.username,
          credential: creds.credential,
        },
      ],
      realm: this.turnRealm,
    };
  }
}
