import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { getOfflineMessages, removeOfflineMessage } from '../utils/offlineQueue';
import { apiFetch } from '../utils/api';
import Constants from 'expo-constants';

const rawSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8002';
const getCleanSocketUrl = (url: string) => {
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const parts = hostUri.split(':');
      if (parts[0]) {
        return url.replace('localhost', parts[0]).replace('127.0.0.1', parts[0]);
      }
    }
    if (Platform.OS === 'android') {
      return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
  }
  return url;
};
const SOCKET_URL = getCleanSocketUrl(rawSocketUrl);

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Record<string, boolean>;
  typingUsers: Record<string, string[]>; // threadId -> userIds
  sendTyping: (threadId: string) => void;
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  syncOfflineQueue: () => Promise<void>;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  const typingTimeoutRef = useRef<Record<string, any>>({});

  const syncOfflineQueue = async () => {
    try {
      const offlineMsgs = await getOfflineMessages();
      if (offlineMsgs.length === 0) return;

      for (const m of offlineMsgs) {
        try {
            await apiFetch(`/chats/threads/${m.threadId}/messages`, {
              method: 'POST',
              // Stable per queued message: a replay after a lost response is not sent twice.
              headers: { 'Idempotency-Key': `chat-offline-${m.id}` },
              body: JSON.stringify({
                body: m.content,
                type: m.messageType,
                client_message_id: m.id,
              }),
            });
          await removeOfflineMessage(m.id);
        } catch (err) {
          console.warn('Syncing offline message failed, halting queue processing', err);
          break;
        }
      }
    } catch (err) {
      console.error('Error in syncOfflineQueue', err);
    }
  };

  useEffect(() => {
    let active = true;
    let socketInstance: Socket | null = null;

    const initSocket = async () => {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      } catch {
        try {
          token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        } catch {}
      }

      if (!token) {
        return;
      }

      socketInstance = io(SOCKET_URL, {
        auth: { token, client: 'patient-app' },
        transports: ['websocket'],
        // P14.21: never give up (it stopped after 10 tries, about a minute, and live updates were gone until the app was
        // restarted); back off from 1 s to 30 s with jitter, so a server restart is not met by every phone at once.
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        // Start presence heartbeat
        socketInstance?.emit('presence:heartbeat');
        // Trigger offline message sync
        syncOfflineQueue();
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
      });

      // Presence events
      socketInstance.on('user:online', ({ user_id }) => {
        setOnlineUsers(prev => ({ ...prev, [user_id]: true }));
      });

      socketInstance.on('user:offline', ({ user_id }) => {
        setOnlineUsers(prev => ({ ...prev, [user_id]: false }));
      });

      // Typing events matching backend
      socketInstance.on('chat:typing:start', ({ thread_id, user_id }) => {
        setTypingUsers(prev => {
          const current = prev[thread_id] || [];
          if (!current.includes(user_id)) {
            return { ...prev, [thread_id]: [...current, user_id] };
          }
          return prev;
        });
      });

      socketInstance.on('chat:typing:stop', ({ thread_id, user_id }) => {
        setTypingUsers(prev => {
          const current = prev[thread_id] || [];
          return { ...prev, [thread_id]: current.filter(id => id !== user_id) };
        });
      });

      // --- V3.0 DOCTOR PLATFORM INTEGRATION ---
      socketInstance.on('copay_required', (payload) => {
        console.log('[Socket] Copay Required Alert received:', payload);
        // Dispatching a custom event that the root layout or an active screen can catch
        // because router.push inside this pure context can sometimes miss the navigation tree
        // if the navigation isn't fully mounted.
        // Instead, we will store it or emit a custom event:
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit('onCopayRequired', payload);
      });

      if (active) {
        setSocket(socketInstance);
      }
    };

    initSocket();

    // P14.21: back in the foreground with the socket down (the OS suspends it in the background): reconnect at once rather
    // than wait for the next backoff step. Screens resync on `connect` (the chat reloads its thread on isConnected).
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && socketInstance && !socketInstance.connected) socketInstance.connect();
    });

    // Heartbeat loop every 20s
    const heartbeatInterval = setInterval(() => {
      if (socketInstance && socketInstance.connected) {
        socketInstance.emit('presence:heartbeat');
      }
    }, 20000);

    return () => {
      active = false;
      appState.remove();
      clearInterval(heartbeatInterval);
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const sendTyping = (threadId: string) => {
    if (socket && isConnected) {
      socket.emit('chat:typing:start', { thread_id: threadId });

      // Clear existing timeout
      if (typingTimeoutRef.current[threadId]) {
        clearTimeout(typingTimeoutRef.current[threadId]);
      }

      // Automatically stop typing after 3 seconds of no keypress
      typingTimeoutRef.current[threadId] = setTimeout(() => {
        socket.emit('chat:typing:stop', { thread_id: threadId });
      }, 3000);
    }
  };

  const joinThread = (threadId: string) => {
    if (socket && isConnected) {
      socket.emit('chat:join', { thread_id: threadId });
    }
  };

  const leaveThread = (threadId: string) => {
    if (socket && isConnected) {
      socket.emit('chat:leave', { thread_id: threadId });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, typingUsers, sendTyping, joinThread, leaveThread, syncOfflineQueue }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
