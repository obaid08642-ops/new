import { logger } from '../../../services/Logger';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../../../constants';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface RealtimeMessage {
  topic: string;
  payload: any;
  timestamp: Date;
}

export class RealtimeClient {
  private log = logger.scope('RealtimeClient');
  private status: SocketStatus = 'disconnected';
  private socket: Socket | null = null;
  private subscriptions = new Map<string, Set<(data: any) => void>>();

  /**
   * Initialize socket connection with Auth Token.
   */
  public async connect(authToken?: string): Promise<void> {
    if (this.status === 'connected' && this.socket?.connected) return;

    this.status = 'connecting';
    this.log.info('Connecting to realtime server...');

    const token = authToken || (await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN));
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8002';
    const cleanUrl = baseUrl.replace('/api/v1', '').replace('/api', '');

    this.socket = io(cleanUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.status = 'connected';
      this.log.info(`Realtime connected: ${this.socket?.id}`);
    });

    this.socket.on('disconnect', (reason) => {
      this.status = 'disconnected';
      this.log.info(`Realtime disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      this.status = 'disconnected';
      this.log.warn(`Realtime connection error: ${err.message}`);
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.status = 'disconnected';
    this.subscriptions.clear();
    this.log.info('Disconnected from realtime server');
  }

  /**
   * Subscribe to a specific domain topic (e.g., "order.123", "chat.room.456")
   */
  public subscribe(topic: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
      if (this.socket) {
        this.socket.emit('subscribe', { topic });
        this.socket.on(topic, (data: any) => {
          const listeners = this.subscriptions.get(topic);
          listeners?.forEach(cb => cb(data));
        });
      }
    }

    this.subscriptions.get(topic)!.add(callback);

    return () => {
      this.subscriptions.get(topic)?.delete(callback);
      if (this.subscriptions.get(topic)?.size === 0) {
        if (this.socket) {
          this.socket.emit('unsubscribe', { topic });
          this.socket.off(topic);
        }
      }
    };
  }

  /**
   * Publish an event to a topic.
   */
  public publish(topic: string, payload: any): void {
    if (!this.socket || !this.socket.connected) {
      this.log.warn(`Cannot publish to ${topic}, socket is disconnected`);
      return;
    }
    this.socket.emit(topic, payload);
  }

  /**
   * Update user presence status (Online/Offline/Typing)
   */
  public setPresence(userId: string, state: 'online' | 'offline' | 'typing', topic?: string): void {
    this.publish('presence:heartbeat', { userId, state, topic });
  }
}
