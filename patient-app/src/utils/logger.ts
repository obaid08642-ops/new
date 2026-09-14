/**
 * Production-safe logger utility
 * Replaces console.log/error/warn with environment-aware logging
 */
import { Platform } from 'react-native';

const isDev = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    // Always log errors for debugging, but could send to Sentry in production
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};

export const logError = (context: string, error: any) => {
  logger.error(`[${context}]`, error);
};

export const logWarn = (context: string, message: any) => {
  logger.warn(`[${context}]`, message);
};
