export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
  roles: string[];
  permissions: string[];
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface AuthResponse {
  success: boolean;
  accessToken?: string;
  sessionToken?: string;
  refreshToken?: string;
  user?: User;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuditLogItem {
  id: string;
  event: string;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: string | null;
  user?: {
    id: string;
    email: string;
    fullName: string;
  } | null;
}

export type AuthUser = User;

export interface LoginCredentials {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  role?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyCodePayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword?: string;
}
