import { SessionManager, SessionData } from '../../../src/core/platform/auth/SessionManager';

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockSecureStorage: any;

  const mockSession: SessionData = {
    sessionId: 's1',
    userId: 'u1',
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    deviceId: 'd1',
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 10000),
    absoluteExpiresAt: new Date(Date.now() + 1000000),
  };

  beforeEach(() => {
    mockSecureStorage = {
      setItem: jest.fn().mockResolvedValue(undefined),
      getItem: jest.fn().mockResolvedValue(null),
      deleteItem: jest.fn().mockResolvedValue(undefined),
    };
    sessionManager = new SessionManager(mockSecureStorage);
  });

  it('should create and retrieve a session', async () => {
    await sessionManager.createSession(mockSession);
    const session = await sessionManager.getSession();
    expect(session?.sessionId).toBe('s1');
  });

  it('should rotate tokens and update session', async () => {
    await sessionManager.createSession(mockSession);
    const newSession = await sessionManager.rotateTokens('old-refresh');
    expect(newSession.accessToken).toBe('new-access-token');
    
    const retrieved = await sessionManager.getSession();
    expect(retrieved?.accessToken).toBe('new-access-token');
  });

  it('should validate session version successfully', async () => {
    await sessionManager.createSession(mockSession);
    const isValid = await sessionManager.validateSessionVersion(1);
    expect(isValid).toBe(true);
  });

  it('should force logout on outdated session version', async () => {
    await sessionManager.createSession(mockSession);
    const isValid = await sessionManager.validateSessionVersion(2);
    expect(isValid).toBe(false);
    
    const retrieved = await sessionManager.getSession();
    expect(retrieved).toBeNull();
  });

  it('should revoke session on admin forced logout', async () => {
    await sessionManager.createSession(mockSession);
    await sessionManager.forceLogoutFromAdmin('suspicious activity');
    
    const retrieved = await sessionManager.getSession();
    expect(retrieved).toBeNull();
  });
});
