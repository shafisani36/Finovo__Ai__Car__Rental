/**
 * Finovo AI Car Rental — API Architecture & Client Test Suite
 * Validates request configuration, error normalization, correlation headers,
 * caching logic, TTL expiration, and domain service dispatch.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Setup Mock Browser Storage & Window Environment for Node.js
const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

(globalThis as any).window = {
  dispatchEvent: () => true,
};

// Import centralized API modules
import { ApiClient } from '../src/api/client';
import { QueryCache } from '../src/api/cache';
import {
  ApiError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  TimeoutError,
  normalizeApiError,
} from '../src/api/errors';
import { API_ENDPOINTS } from '../src/api/endpoints';

describe('1. Centralized ApiClient Core Architecture', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  test('Should properly store and retrieve JWT access tokens in localStorage', () => {
    const client = new ApiClient('http://localhost:5000/api/v1');
    assert.equal(client.getAccessToken(), null);

    client.setAccessToken('sample-jwt-token-12345');
    assert.equal(client.getAccessToken(), 'sample-jwt-token-12345');
    assert.equal(storageMap.get('finovo_access_token'), 'sample-jwt-token-12345');

    client.setAccessToken(null);
    assert.equal(client.getAccessToken(), null);
    assert.equal(storageMap.get('finovo_access_token'), undefined);
  });

  test('Should inject Authorization Bearer header when token is present', async () => {
    let capturedHeaders: Headers | null = null;
    let capturedUrl: string | null = null;

    // Mock native fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ success: true, data: { status: 'ok' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    try {
      const client = new ApiClient('http://localhost:5000/api/v1');
      client.setAccessToken('valid-test-bearer-token');

      const response = await client.get<{ success: boolean; data: { status: string } }>(
        '/test-endpoint'
      );

      assert.equal(response.success, true);
      assert.equal(capturedUrl, 'http://localhost:5000/api/v1/test-endpoint');
      assert.equal(capturedHeaders?.get('Authorization'), 'Bearer valid-test-bearer-token');
      assert.ok(capturedHeaders?.get('X-Correlation-Id')?.startsWith('req_'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Should serialize query parameters properly without empty or null values', async () => {
    let capturedUrl: string | null = null;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    try {
      const client = new ApiClient('http://localhost:5000/api/v1');
      await client.get('/vehicles', {
        params: {
          page: 2,
          limit: 10,
          category: 'LUXURY',
          status: 'AVAILABLE',
          emptyField: '',
          nullField: null,
          undefField: undefined,
        },
      });

      assert.ok(capturedUrl?.includes('page=2'));
      assert.ok(capturedUrl?.includes('limit=10'));
      assert.ok(capturedUrl?.includes('category=LUXURY'));
      assert.ok(capturedUrl?.includes('status=AVAILABLE'));
      assert.ok(!capturedUrl?.includes('emptyField'));
      assert.ok(!capturedUrl?.includes('nullField'));
      assert.ok(!capturedUrl?.includes('undefField'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('2. Error Classification & Normalization Hierarchy', () => {
  test('Should map HTTP 400 to ValidationError with details', () => {
    const error = normalizeApiError({
      status: 400,
      message: 'Invalid vehicle registration number format',
      details: [{ field: 'registrationNumber', message: 'Must match standard plate format' }],
    });

    assert.ok(error instanceof ValidationError);
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.message, 'Invalid vehicle registration number format');
    assert.ok(Array.isArray(error.details));
  });

  test('Should map HTTP 401 to AuthenticationError', () => {
    const error = normalizeApiError({
      status: 401,
      message: 'Invalid email or password',
    });

    assert.ok(error instanceof AuthenticationError);
    assert.equal(error.status, 401);
    assert.equal(error.code, 'UNAUTHENTICATED');
  });

  test('Should map HTTP 404 to NotFoundError', () => {
    const error = normalizeApiError({
      status: 404,
      message: 'Vehicle not found with ID: v_99999',
    });

    assert.ok(error instanceof NotFoundError);
    assert.equal(error.status, 404);
    assert.equal(error.code, 'NOT_FOUND');
  });

  test('Should map AbortError to TimeoutError', () => {
    const abortErr = new DOMException('Request timed out', 'AbortError');
    const normalized = normalizeApiError(abortErr);

    assert.ok(normalized instanceof TimeoutError);
    assert.equal(normalized.status, 408);
    assert.equal(normalized.code, 'REQUEST_TIMEOUT');
  });
});

describe('3. QueryCache & Reactive Invalidation Engine', () => {
  test('Should cache data and retrieve within staleTime window', () => {
    const cache = new QueryCache();
    cache.set('vehicles:list:1', { items: ['car1', 'car2'] }, 1000);

    const cached = cache.get<{ items: string[] }>('vehicles:list:1');
    assert.deepEqual(cached?.items, ['car1', 'car2']);
  });

  test('Should return undefined for expired cache keys', async () => {
    const cache = new QueryCache();
    // Cache with ultra-short 10ms TTL
    cache.set('short-lived', { active: true }, 10);

    await new Promise((r) => setTimeout(r, 25));

    const result = cache.get('short-lived');
    assert.equal(result, undefined);
  });

  test('Should invalidate queries matching prefix and notify active subscribers', () => {
    const cache = new QueryCache();
    cache.set('vehicles:list:1', { data: 1 });
    cache.set('vehicles:list:2', { data: 2 });
    cache.set('vehicles:metrics', { total: 40 });
    cache.set('bookings:list:1', { bookings: [] });

    let invalidatedNotified = '';
    const unsubscribe = cache.subscribe((key) => {
      invalidatedNotified = key;
    });

    // Invalidate vehicles
    cache.invalidateQueries('vehicles');

    assert.equal(cache.get('vehicles:list:1'), undefined);
    assert.equal(cache.get('vehicles:list:2'), undefined);
    assert.equal(cache.get('vehicles:metrics'), undefined);
    // Unrelated booking cache must remain intact
    assert.ok(cache.get('bookings:list:1') !== undefined);
    assert.equal(invalidatedNotified, 'vehicles');

    unsubscribe();
  });
});

describe('4. Centralized Endpoint Registry Integrity', () => {
  test('All critical backend routes should match standard v1 paths', () => {
    assert.equal(API_ENDPOINTS.AUTH.LOGIN, '/auth/login');
    assert.equal(API_ENDPOINTS.AUTH.REGISTER, '/auth/register');
    assert.equal(API_ENDPOINTS.VEHICLES.LIST, '/vehicles');
    assert.equal(API_ENDPOINTS.VEHICLES.DASHBOARD_STATS, '/vehicles/dashboard-stats');
    assert.equal(API_ENDPOINTS.VEHICLES.BY_ID('veh_1'), '/vehicles/veh_1');
    assert.equal(API_ENDPOINTS.VEHICLES.PRICING('veh_1'), '/vehicles/veh_1/pricing');
    assert.equal(API_ENDPOINTS.BOOKINGS.LIST, '/bookings');
    assert.equal(API_ENDPOINTS.BOOKINGS.QUOTE, '/bookings/quote');
    assert.equal(API_ENDPOINTS.DASHBOARD.OVERVIEW, '/dashboard/overview');
    assert.equal(API_ENDPOINTS.ADMIN.USERS, '/admin/users');
    assert.equal(API_ENDPOINTS.ADMIN.AUDIT_LOGS, '/admin/audit-logs');
  });
});
