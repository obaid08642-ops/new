import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
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

  constructor(@Optional() @InjectConnection() private readonly conn?: Connection) {
    this.coturnHost = process.env.COTURN_HOST || 'turn.example.com';
    // No fallback: a default secret is public (it is in this repo), so anyone could
    // mint valid TURN credentials offline. Without COTURN_SECRET, TURN is unconfigured.
    this.coturnSecret = process.env.COTURN_SECRET || '';
    this.stunPort = parseInt(process.env.COTURN_STUN_PORT || '3478', 10);
    this.turnPort = parseInt(process.env.COTURN_TURN_PORT || '3478', 10);
    // TURN realm — must match the `realm=` directive in turnserver.conf
    this.turnRealm = process.env.TURN_REALM || process.env.COTURN_REALM || 'nabdahplus';
    // Full override: comma-separated ICE URLs (e.g. "stun:turn.example.com:3478,turn:turn.example.com:3478?transport=udp")
    this.customUrls = process.env.TURN_URLS
      ? process.env.TURN_URLS.split(',').map((u) => u.trim()).filter(Boolean)
      : null;
  }

  /** Q94: about the length of a call setup; the client asks again for a new call. */
  static readonly TTL_SECONDS = 600;

  /** Q94: the caller must be the patient or the provider of an INITIATED/ACTIVE call session. */
  async assertCallParty(userId: string, sessionId: string): Promise<void> {
    if (!sessionId || typeof sessionId !== 'string') throw new BadRequestException('session_id_required');
    if (!this.conn) throw new ServiceUnavailableException('call_store_unavailable');
    const s: any = await this.conn.collection('callsessions').findOne({ id: { $eq: sessionId } } as any);
    if (!s) throw new NotFoundException('call_session_not_found');
    if (![s.patient_id, s.provider_id].map(String).includes(String(userId))) throw new ForbiddenException('not_a_call_party');
    if (!['INITIATED', 'ACTIVE'].includes(String(s.status))) throw new ForbiddenException('call_session_not_active');
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

  /** True only when a real TURN host is configured (never the placeholder). */
  isConfigured(): boolean {
    return (!!process.env.COTURN_HOST || !!process.env.TURN_URLS) && !!this.coturnSecret;
  }

  /**
   * Generate time-limited TURN credentials using HMAC-SHA1.
   * Compatible with Coturn's REST API auth (--use-auth-secret flag).
   * The username format `<expiry-timestamp>:<userId>` is the Coturn REST API standard.
   */
  generateCredentials(userId: string, ttlSeconds = CoturnService.TTL_SECONDS): TurnCredentials {
    if (!this.isConfigured()) throw new ServiceUnavailableException('coturn_not_configured');
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
