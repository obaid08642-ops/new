import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class FieldEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('FIELD_ENCRYPTION_KEY');
    if (!secret) {
      throw new Error('FIELD_ENCRYPTION_KEY must be configured');
    }
    // Derive 32-byte key from secret using PBKDF2
    this.key = crypto.pbkdf2Sync(secret, 'nabd-field-encryption-salt', 100000, 32, 'sha256');
  }

  /**
   * Encrypt a field value
   * Returns: iv:authTag:encryptedData (all base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;
    
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Decrypt a field value
   * Expects: iv:authTag:encryptedData (all base64)
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext;
    
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // Not encrypted or corrupted - return as-is (fail-open for migration)
      return ciphertext;
    }
    
    try {
      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = Buffer.from(parts[2], 'base64');
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch {
      // Decryption failed - return as-is (fail-open for migration)
      return ciphertext;
    }
  }

  /**
   * Check if a value appears to be encrypted
   */
  isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(':');
    return parts.length === 3 && 
           parts.every(p => /^[A-Za-z0-9+/]+=*$/.test(p)); // base64 check
  }
}

/**
 * Create a Mongoose plugin for field-level encryption
 * Usage: schema.plugin(createFieldEncryptionPlugin(encryptionService), { fields: ['diagnosis', 'prescription', 'report'] })
 */
export function createFieldEncryptionPlugin(encryptionService: FieldEncryptionService) {
  return function(schema: any, options: { fields: string[] }) {
    const { fields } = options;
    
    // Encrypt before save
    schema.pre('save', function(next) {
      fields.forEach(field => {
        const value = this.get(field);
        if (value && typeof value === 'string' && !encryptionService.isEncrypted(value)) {
          this.set(field, encryptionService.encrypt(value));
        }
      });
      next();
    });
    
    // Decrypt on find (using toJSON transform)
    schema.set('toJSON', {
      transform: (doc, ret) => {
        fields.forEach(field => {
          if (ret[field] && encryptionService.isEncrypted(ret[field])) {
            ret[field] = encryptionService.decrypt(ret[field]);
          }
        });
        return ret;
      }
    });
    
    schema.set('toObject', {
      transform: (doc, ret) => {
        fields.forEach(field => {
          if (ret[field] && encryptionService.isEncrypted(ret[field])) {
            ret[field] = encryptionService.decrypt(ret[field]);
          }
        });
        return ret;
      }
    });
  };
}
