import { generateErrorId, hashErrorId, extractErrorIdFromMessage, createErrorResponse } from './error-id';

describe('Error ID utilities', () => {
  describe('generateErrorId', () => {
    it('generates a unique error ID with correct prefix', () => {
      const id1 = generateErrorId();
      const id2 = generateErrorId();
      
      expect(id1).toMatch(/^ERR-[A-F0-9]{12}$/);
      expect(id2).toMatch(/^ERR-[A-F0-9]{12}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('hashErrorId', () => {
    it('produces consistent hash for same input', () => {
      const id = 'ERR-ABCDEF123456';
      const hash1 = hashErrorId(id);
      const hash2 = hashErrorId(id);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{16}$/);
    });

    it('produces different hashes for different inputs', () => {
      expect(hashErrorId('ERR-ABCDEF123456')).not.toBe(hashErrorId('ERR-FEDCBA654321'));
    });
  });

  describe('extractErrorIdFromMessage', () => {
    it('extracts error ID from production message', () => {
      const message = 'Error ERR-ABCDEF123456: Internal server error';
      expect(extractErrorIdFromMessage(message)).toBe('ERR-ABCDEF123456');
    });

    it('returns null when no error ID present', () => {
      expect(extractErrorIdFromMessage('Just a regular message')).toBeNull();
      expect(extractErrorIdFromMessage('')).toBeNull();
    });
  });

  describe('createErrorResponse', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('returns generic message with errorId in production', () => {
      process.env.NODE_ENV = 'production';
      const response = createErrorResponse('ERR-TEST12345678', 500);
      
      expect(response.code).toBe('SERVER_ERROR');
      expect(response.errorId).toBe('ERR-TEST12345678');
      expect(response.message).not.toContain('stack');
      expect(response.message).not.toContain('trace');
      expect(response.message).toContain('unexpected error');
    });

    it('returns detailed message with errorId in non-production', () => {
      process.env.NODE_ENV = 'development';
      const response = createErrorResponse('ERR-TEST12345678', 500);
      
      expect(response.errorId).toBe('ERR-TEST12345678');
      expect(response.message).toContain('ERR-TEST12345678');
    });

    it('maps known status codes to appropriate messages', () => {
      process.env.NODE_ENV = 'production';
      
      expect(createErrorResponse('ERR-1', 400).message).toContain('Invalid request');
      expect(createErrorResponse('ERR-2', 401).message).toContain('Authentication required');
      expect(createErrorResponse('ERR-3', 403).message).toContain('permission');
      expect(createErrorResponse('ERR-4', 404).message).toContain('not found');
      expect(createErrorResponse('ERR-5', 429).message).toContain('Too many requests');
      expect(createErrorResponse('ERR-6', 502).message).toContain('unavailable');
      expect(createErrorResponse('ERR-7', 503).message).toContain('unavailable');
      expect(createErrorResponse('ERR-8', 504).message).toContain('timed out');
    });

    it('falls back to generic 500 message for unknown status codes', () => {
      process.env.NODE_ENV = 'production';
      const response = createErrorResponse('ERR-UNKNOWN', 999);
      
      expect(response.message).toContain('unexpected error');
    });
  });
});