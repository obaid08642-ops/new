import { isDbOutageError } from './db-outage';

describe('isDbOutageError', () => {
  it('detects connection-class failures', () => {
    expect(isDbOutageError(new Error('getaddrinfo ENOTFOUND mongodb'))).toBe(true);
    expect(isDbOutageError({ name: 'MongoNotConnectedError', message: 'Client must be connected' })).toBe(true);
    expect(isDbOutageError({ name: 'MongoServerSelectionError', message: 'x' })).toBe(true);
    expect(isDbOutageError(new Error('connect ECONNREFUSED 127.0.0.1'))).toBe(true);
  });

  it('lets real bugs through', () => {
    expect(isDbOutageError(new Error('ValidationError: bad value'))).toBe(false);
    expect(isDbOutageError(new TypeError('Cannot read properties of null'))).toBe(false);
    expect(isDbOutageError(null)).toBe(false);
  });
});
