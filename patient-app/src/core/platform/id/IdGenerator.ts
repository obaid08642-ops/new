import * as Crypto from 'expo-crypto';

export class IdGenerator {
  /**
   * Generate a cryptographically secure UUID v4
   */
  public static generateId(): string {
    return Crypto.randomUUID();
  }

  /**
   * Generate a short ID for orders/invoices
   */
  public static generateShortId(prefix: string = ''): string {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return prefix ? `${prefix}-${randomStr}` : randomStr;
  }
}
