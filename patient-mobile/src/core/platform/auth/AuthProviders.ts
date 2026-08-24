import { SessionData } from './SessionManager';

export interface AuthCredentials {
  token?: string; // For OAuth/Apple
  email?: string;
  phone?: string;
  password?: string;
  otp?: string;
}

export interface IAuthProvider {
  providerName: string;

  signIn(credentials: AuthCredentials): Promise<SessionData>;
  signUp(credentials: AuthCredentials): Promise<SessionData>;
  signOut(): Promise<void>;
  refreshToken(token: string): Promise<SessionData>;
  revokeSession(sessionId: string): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
  resetPassword(emailOrPhone: string): Promise<void>;
  verifyOTP(identifier: string, code: string): Promise<boolean>;
  linkProvider(userId: string, credentials: AuthCredentials): Promise<void>;
  unlinkProvider(userId: string): Promise<void>;
}

// ---------------------------------------------------------
// Example Abstract Stubs
// ---------------------------------------------------------

export class EmailAuthProvider implements IAuthProvider {
  providerName = 'Email';
  public async signIn(credentials: AuthCredentials): Promise<SessionData> { return {} as SessionData; }
  public async signUp(credentials: AuthCredentials): Promise<SessionData> { return {} as SessionData; }
  public async signOut(): Promise<void> {}
  public async refreshToken(token: string): Promise<SessionData> { return {} as SessionData; }
  public async revokeSession(sessionId: string): Promise<void> {}
  public async deleteAccount(userId: string): Promise<void> {}
  public async resetPassword(emailOrPhone: string): Promise<void> {}
  public async verifyOTP(identifier: string, code: string): Promise<boolean> { return true; }
  public async linkProvider(userId: string, credentials: AuthCredentials): Promise<void> {}
  public async unlinkProvider(userId: string): Promise<void> {}
}

export class GoogleAuthProvider implements IAuthProvider {
  providerName = 'Google';
  public async signIn(credentials: AuthCredentials): Promise<SessionData> { return {} as SessionData; }
  public async signUp(credentials: AuthCredentials): Promise<SessionData> { return {} as SessionData; }
  public async signOut(): Promise<void> {}
  public async refreshToken(token: string): Promise<SessionData> { return {} as SessionData; }
  public async revokeSession(sessionId: string): Promise<void> {}
  public async deleteAccount(userId: string): Promise<void> {}
  public async resetPassword(emailOrPhone: string): Promise<void> {}
  public async verifyOTP(identifier: string, code: string): Promise<boolean> { return true; }
  public async linkProvider(userId: string, credentials: AuthCredentials): Promise<void> {}
  public async unlinkProvider(userId: string): Promise<void> {}
}

export class AppleAuthProvider implements IAuthProvider {
  providerName = 'Apple';
  public async signIn(credentials: AuthCredentials): Promise<SessionData> { return {} as SessionData; }
  public async signUp(credentials: AuthCredentials): Promise<SessionData> { return {} as SessionData; }
  public async signOut(): Promise<void> {}
  public async refreshToken(token: string): Promise<SessionData> { return {} as SessionData; }
  public async revokeSession(sessionId: string): Promise<void> {}
  public async deleteAccount(userId: string): Promise<void> {}
  public async resetPassword(emailOrPhone: string): Promise<void> {}
  public async verifyOTP(identifier: string, code: string): Promise<boolean> { return true; }
  public async linkProvider(userId: string, credentials: AuthCredentials): Promise<void> {}
  public async unlinkProvider(userId: string): Promise<void> {}
}
