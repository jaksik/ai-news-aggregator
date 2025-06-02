/**
 * Standardized API response types for consistent API responses across all endpoints
 * This eliminates the various response type definitions scattered throughout the codebase
 */

// Base API response interface
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: ResponseMeta;
}

// Pagination metadata for list responses
export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// General response metadata
export interface ResponseMeta extends PaginationMeta {
  timestamp?: string;
  version?: string;
  requestId?: string;
  pagination?: PaginationMeta;
  filters?: Record<string, unknown>;
  category?: string; // Error category for better error classification
  stack?: string; // Stack trace for development
  details?: string; // Additional error details
}

// Error response with detailed error information
export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  details?: string;
  errors?: Record<string, unknown>; // For validation errors
  statusCode?: number;
}

// Success response
export interface ApiSuccessResponse<T = unknown> extends ApiResponse<T> {
  success: true;
  data?: T;
}

// List response for collections
export interface ApiListResponse<T = unknown> extends ApiSuccessResponse<T[]> {
  meta: PaginationMeta;
}

// HTTP method types for route handlers
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Request handler function type
export type RequestHandler<T = unknown> = (
  req: import('next').NextApiRequest,
  res: import('next').NextApiResponse<ApiResponse<T>>
) => Promise<void>;

// Method handlers map for createMethodHandler
export type MethodHandlers<T = unknown> = Partial<Record<HttpMethod, RequestHandler<T>>>;

// Query parameters for filtering and pagination
export interface BaseQueryParams {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Source-specific query parameters
export interface SourceQueryParams extends BaseQueryParams {
  isEnabled?: string;
  type?: 'rss' | 'html';
  name?: string;
}

// Article-specific query parameters
export interface ArticleQueryParams extends BaseQueryParams {
  source?: string;
  startDate?: string;
  endDate?: string;
  includeHidden?: string;
  isRead?: string;
  isStarred?: string;
}

// Fetch operation result types
export interface FetchOperationResult {
  sourcesProcessed: number;
  articlesAdded: number;
  errors: string[];
  duration: number;
}

// Common validation error structure
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// API configuration options
export interface ApiConfig {
  enableAuth?: boolean;
  enableCors?: boolean;
  enableRateLimit?: boolean;
  maxRequestSize?: string;
}
