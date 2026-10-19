import React, { useState, useEffect, useCallback } from 'react';
import type { User, AuthResponse } from '../types/auth.types';
import { authClient } from '../api/authClient';
import { AuthContext } from './auth-context-def';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await authClient.request<{ success: boolean; user: User }>('/auth/me');
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial authentication check on application boot
  useEffect(() => {
    const initAuth = async () => {
      const token = authClient.getAccessToken();
      if (token) {
        await fetchCurrentUser();
      } else {
        // Try refresh token via cookie
        const refreshRes = await authClient.refreshToken();
        if (refreshRes?.accessToken && refreshRes?.user) {
          authClient.setAccessToken(refreshRes.accessToken);
          setUser(refreshRes.user);
        }
        setIsLoading(false);
      }
    };

    initAuth();

    const handleSessionExpired = () => {
      setUser(null);
      authClient.setAccessToken(null);
    };

    window.addEventListener('finovo:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('finovo:session_expired', handleSessionExpired);
    };
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string, rememberMe = false): Promise<AuthResponse> => {
    const data = await authClient.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });

    if (data.accessToken && data.user) {
      authClient.setAccessToken(data.accessToken);
      setUser(data.user);
    }

    return data;
  };

  const register = async (fullName: string, email: string, password: string): Promise<AuthResponse> => {
    const data = await authClient.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password }),
    });
    return data;
  };

  const logout = async (): Promise<void> => {
    try {
      await authClient.request('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout API call failed, clearing local state anyway', err);
    } finally {
      authClient.setAccessToken(null);
      setUser(null);
    }
  };

  const requestPasswordReset = async (email: string) => {
    return authClient.request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const verifyResetCode = async (email: string, code: string): Promise<boolean> => {
    const res = await authClient.request<{ success: boolean; valid: boolean }>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    return Boolean(res.valid);
  };

  const resetPassword = async (email: string, code: string, newPassword: string): Promise<AuthResponse> => {
    return authClient.request<AuthResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        requestPasswordReset,
        verifyResetCode,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
