export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'doctor' | 'pharmacist' | 'guest';
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthResult {
  user: AuthUser;
  session: AuthSession;
}

export interface AuthProvider {
  id: string;
  name: string;
  login(credentials?: any): Promise<AuthResult>;
  logout(): Promise<void>;
  // Some providers might need initialization
  initialize?(): Promise<void>;
}
