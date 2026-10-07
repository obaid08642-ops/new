import { randomUUID, createHash } from 'crypto';

const ERROR_ID_PREFIX = 'ERR';

export function generateErrorId(): string {
  return `${ERROR_ID_PREFIX}-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

export function hashErrorId(errorId: string): string {
  return createHash('sha256').update(errorId).digest('hex').slice(0, 16);
}

export function extractErrorIdFromMessage(message: string): string | null {
  const match = message.match(new RegExp(`${ERROR_ID_PREFIX}-[A-F0-9]{12}`));
  return match ? match[0] : null;
}

export function createErrorResponse(errorId: string, statusCode: number): {
  code: string;
  message: string;
  errorId: string;
} {
  const isProduction = process.env.NODE_ENV === 'production';

  const genericMessages: Record<number, string> = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Authentication required. Please sign in to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'A conflict occurred. This may be a duplicate request.',
    422: 'The request could not be processed. Please verify your data.',
    429: 'Too many requests. Please wait and try again.',
    500: 'An unexpected error occurred. Please try again later.',
    502: 'Service temporarily unavailable. Please try again.',
    503: 'Service temporarily unavailable. Please try again.',
    504: 'Request timed out. Please try again.',
  };

  return {
    code: isProduction ? 'SERVER_ERROR' : 'SERVER_ERROR',
    message: isProduction
      ? (genericMessages[statusCode] || genericMessages[500])
      : `Error ${errorId}: ${genericMessages[statusCode] || 'Internal server error'}`,
    errorId,
  };
}