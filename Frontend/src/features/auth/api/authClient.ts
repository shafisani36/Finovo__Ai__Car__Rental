/**
 * Finovo AI Car Rental — Auth Client Adapter
 * Bridges legacy imports to the centralized enterprise ApiClient.
 */

import { apiClient, ApiClient } from '../../../api/client';
import type { AuthResponse } from '../types/auth.types';

export class AuthApiClient {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  public setAccessToken(token: string | null): void {
    this.client.setAccessToken(token);
  }

  public getAccessToken(): string | null {
    return this.client.getAccessToken();
  }

  public async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.client.request<T>(endpoint, options);
  }

  public async refreshToken(): Promise<AuthResponse | null> {
    return (await this.client.refreshToken()) as AuthResponse | null;
  }
}

export const authClient = new AuthApiClient();
