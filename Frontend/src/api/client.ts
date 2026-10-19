import { normalizeApiError, ApiError, AuthenticationError } from './errors';
import type { RequestOptions } from './types';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5000/api/v1';

const DEFAULT_TIMEOUT_MS = 15000;

export class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // Hydrate token from storage on boot if available
    try {
      this.accessToken = localStorage.getItem('finovo_access_token');
    } catch {
      this.accessToken = null;
    }
  }

  public setAccessToken(token: string | null): void {
    this.accessToken = token;
    try {
      if (token) {
        localStorage.setItem('finovo_access_token', token);
      } else {
        localStorage.removeItem('finovo_access_token');
      }
    } catch {
      // Ignore storage write issues (e.g. private mode)
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  private onTokenRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    const rawUrl = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    if (!params) return rawUrl;

    const url = new URL(rawUrl);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.append(key, String(val));
      }
    });
    return url.toString();
  }

  /**
   * Performs an authenticated token refresh against the backend.
   */
  public async refreshToken(): Promise<{ accessToken: string } | null> {
    try {
      const res = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data as { accessToken: string };
    } catch {
      return null;
    }
  }

  /**
   * Primary HTTP request orchestrator with timeout, token injection, and retry coordination.
   */
  public async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      params,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      skipAuth = false,
      correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      signal: userSignal,
      body,
      headers: customHeaders,
      ...customInit
    } = options;

    const targetUrl = this.buildUrl(endpoint, params as Record<string, unknown>);
    const headers = new Headers(customHeaders || {});

    // Set JSON headers unless sending FormData
    if (!headers.has('Content-Type') && !(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Correlation header
    headers.set('X-Correlation-Id', correlationId);

    // Attach JWT if available and auth not explicitly bypassed
    if (!skipAuth && this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    // Setup Timeout Controller linked with user cancellation signal
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    if (userSignal) {
      userSignal.addEventListener('abort', () => timeoutController.abort(userSignal.reason));
    }

    const payloadBody =
      body instanceof FormData || typeof body === 'string' || body === undefined
        ? (body as BodyInit)
        : JSON.stringify(body);

    const config: RequestInit = {
      ...customInit,
      headers,
      body: payloadBody,
      credentials: 'include', // Always send HttpOnly refresh cookies
      signal: timeoutController.signal,
    };

    let response: Response;

    try {
      response = await fetch(targetUrl, config);
    } catch (networkError) {
      clearTimeout(timeoutId);
      throw normalizeApiError(networkError);
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle 401 Unauthorized with token refresh rotation
    const isAuthRoute =
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/register');

    if (response.status === 401 && !isAuthRoute && !skipAuth) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;

        try {
          const refreshResult = await this.refreshToken();
          this.isRefreshing = false;

          if (refreshResult?.accessToken) {
            this.setAccessToken(refreshResult.accessToken);
            this.onTokenRefreshed(refreshResult.accessToken);

            // Retry original request with newly issued token
            headers.set('Authorization', `Bearer ${refreshResult.accessToken}`);
            response = await fetch(targetUrl, { ...config, headers });
          } else {
            throw new AuthenticationError('Session expired. Please log in again.');
          }
        } catch (refreshErr) {
          this.isRefreshing = false;
          this.setAccessToken(null);
          this.refreshSubscribers = [];
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('finovo:session_expired'));
          }
          throw normalizeApiError(refreshErr);
        }
      } else {
        // Queue concurrent requests behind ongoing refresh
        const retryPromise = new Promise<Response>((resolve) => {
          this.addRefreshSubscriber(async (newToken: string) => {
            headers.set('Authorization', `Bearer ${newToken}`);
            const retryRes = await fetch(targetUrl, { ...config, headers });
            resolve(retryRes);
          });
        });
        response = await retryPromise;
      }
    }

    // Parse JSON response body safely
    let responseData: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json().catch(() => null);
    }

    if (!response.ok) {
      const errorMessage =
        responseData?.error?.message ||
        responseData?.message ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      const apiError = new ApiError(
        errorMessage,
        response.status,
        responseData?.error?.code || 'HTTP_ERROR',
        responseData?.error?.details || responseData,
        correlationId
      );
      throw normalizeApiError(apiError);
    }

    return responseData as T;
  }

  // Convenience verbs
  public get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public put<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public patch<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  public delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
