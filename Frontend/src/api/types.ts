export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined | null;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: ApiQueryParams;
  timeoutMs?: number;
  skipAuth?: boolean;
  correlationId?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}
