import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Secure Storage – wraps expo-secure-store with AsyncStorage fallback
// ---------------------------------------------------------------------------

export async function secureSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (storageError) {
    if (__DEV__) {
      console.warn(`[Security] SecureStore set failed for key "${key}", falling back to AsyncStorage`, storageError);
    }
    await AsyncStorage.setItem(key, value);
  }
}

export async function secureGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (storageError) {
    if (__DEV__) {
      console.warn(`[Security] SecureStore get failed for key "${key}", falling back to AsyncStorage`, storageError);
    }
    return await AsyncStorage.getItem(key);
  }
}

export async function secureDelete(key: string): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(key);
    }
    await AsyncStorage.removeItem(key);
  } catch (storageError) {
    if (__DEV__) {
      console.warn(`[Security] SecureStore delete failed for key "${key}"`, storageError);
    }
    await AsyncStorage.removeItem(key);
  }
}

// ---------------------------------------------------------------------------
// Input Sanitization
// ---------------------------------------------------------------------------

/** Remove HTML tags and script injections */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/** Sanitize phone number — digits only */
export function sanitizePhone(input: string): string {
  return input.replace(/[^\d+]/g, '').substring(0, 15);
}

/** Sanitize email */
export function sanitizeEmail(input: string): string {
  return input.toLowerCase().trim().substring(0, 254);
}

/** Sanitize name — letters, spaces, Arabic chars only */
export function sanitizeName(input: string): string {
  return input
    .replace(/[^\p{L}\s'-]/gu, '')
    .trim()
    .substring(0, 100);
}

/** Validate Saudi phone number */
export function isValidSaudiPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return /^(05|5)\d{8}$/.test(cleaned);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

export function isTokenExpired(expiryTimestamp: number | null): boolean {
  if (!expiryTimestamp) return true;
  return Date.now() >= expiryTimestamp - 60000; // 1 minute buffer
}

// ---------------------------------------------------------------------------
// Social Login Data Cleaning
// ---------------------------------------------------------------------------

export interface SocialLoginData {
  email?: string;
  name?: string;
  avatar?: string;
  provider: string;
}

export function cleanSocialLoginData(data: SocialLoginData): SocialLoginData {
  return {
    email: data.email ? sanitizeEmail(data.email) : undefined,
    name: data.name ? sanitizeName(data.name) : undefined,
    avatar: data.avatar,
    provider: data.provider,
  };
}

// ---------------------------------------------------------------------------
// Audit Logger (events for security review)
// ---------------------------------------------------------------------------

export type AuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'BIOMETRIC_AUTH'
  | 'PASSWORD_CHANGE'
  | 'PROFILE_UPDATE'
  | 'CHAT_SESSION_START'
  | 'CHAT_SESSION_END'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'EMERGENCY_SOS';

interface AuditLogEntry {
  event: AuditEvent;
  timestamp: number;
  details?: Record<string, string | number | boolean>;
}

const auditBuffer: AuditLogEntry[] = [];

export function logAuditEvent(
  event: AuditEvent,
  details?: Record<string, string | number | boolean>,
): void {
  const entry: AuditLogEntry = {
    event,
    timestamp: Date.now(),
    details,
  };
  auditBuffer.push(entry);

  // Client-side audit buffer only; the authoritative audit trail lives on the backend

  // Keep only last 100 entries in memory
  if (auditBuffer.length > 100) {
    auditBuffer.splice(0, auditBuffer.length - 100);
  }
}

export function getAuditLog(): ReadonlyArray<AuditLogEntry> {
  return auditBuffer;
}
