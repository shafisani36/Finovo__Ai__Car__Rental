import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  LoginCredentials,
  RegisterPayload,
  ForgotPasswordPayload,
  VerifyCodePayload,
  ResetPasswordPayload,
  AuthResponse,
  AuthUser,
  SessionInfo,
} from '../../features/auth/types/auth.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials, {
      skipAuth: true,
    });
    if (res.accessToken) {
      apiClient.setAccessToken(res.accessToken);
    }
    return res;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, payload, {
      skipAuth: true,
    });
    if (res.accessToken) {
      apiClient.setAccessToken(res.accessToken);
    }
    return res;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.AUTH.LOGOUT
      );
      return res;
    } finally {
      apiClient.setAccessToken(null);
    }
  },

  getMe: async (): Promise<{ success: boolean; user: AuthUser }> => {
    return apiClient.get<{ success: boolean; user: AuthUser }>(API_ENDPOINTS.AUTH.ME);
  },

  forgotPassword: async (
    payload: ForgotPasswordPayload
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, payload, { skipAuth: true });
  },

  verifyResetCode: async (
    payload: VerifyCodePayload
  ): Promise<{ success: boolean; message: string; verifiedToken?: string }> => {
    return apiClient.post(API_ENDPOINTS.AUTH.VERIFY_CODE, payload, { skipAuth: true });
  },

  resetPassword: async (
    payload: ResetPasswordPayload
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload, { skipAuth: true });
  },

  // Sessions
  listSessions: async (): Promise<{ success: boolean; sessions: SessionInfo[] }> => {
    return apiClient.get(API_ENDPOINTS.SESSIONS.LIST);
  },

  revokeSession: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.SESSIONS.REVOKE(sessionId));
  },

  revokeOtherSessions: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(API_ENDPOINTS.SESSIONS.REVOKE_ALL_OTHERS);
  },
};
