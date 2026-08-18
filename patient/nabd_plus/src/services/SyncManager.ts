import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

interface SyncRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  headers?: any;
  timestamp: number;
  retries: number;
}

export class SyncManager {
  private static readonly QUEUE_KEY = '@nabdah_offline_queue';
  private static isSyncing = false;

  static async enqueueRequest(req: Omit<SyncRequest, 'id' | 'timestamp' | 'retries'>) {
    const queue = await this.getQueue();
    const newReq: SyncRequest = {
      ...req,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(newReq);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }

  static async getQueue(): Promise<SyncRequest[]> {
    try {
      const data = await AsyncStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async sync() {
    if (this.isSyncing) return;
    
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    this.isSyncing = true;
    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      // Sort by timestamp to preserve ordering
      queue.sort((a, b) => a.timestamp - b.timestamp);

      const failedQueue: SyncRequest[] = [];

      for (const req of queue) {
        try {
          const resp = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.data ? JSON.stringify(req.data) : undefined,
          });

          if (!resp.ok && resp.status >= 500) {
            req.retries++;
            if (req.retries < 5) failedQueue.push(req);
          }
        } catch (e) {
          req.retries++;
          if (req.retries < 5) failedQueue.push(req);
        }
      }

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(failedQueue));
    } finally {
      this.isSyncing = false;
    }
  }

  static initialize() {
    NetInfo.addEventListener((state: any) => {
      if (state.isConnected) this.sync();
    });

    AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') this.sync();
    });
  }
}
