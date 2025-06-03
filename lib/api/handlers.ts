/**
 * Method routing utilities for creating standardized API handlers
 * Eliminates repetitive method checking and routing across API endpoints
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse, HttpMethod, MethodHandlers, RequestHandler } from './types';
import { withHandler } from './middleware';
import { ValidationError, AuthenticationError, AppError } from '../errors/errorHandler';

/**
 * Creates a standardized method handler that routes requests based on HTTP method
 * Eliminates repetitive if/else method checking in API routes
 * 
 * @param handlers - Object mapping HTTP methods to handler functions
 * @returns Configured Next.js API handler
 * 
 * @example
 * export default createMethodHandler<ISource>({
 *   GET: async (req, res) => { ... },
 *   POST: async (req, res) => { ... },
 *   PUT: async (req, res) => { ... },
 *   DELETE: async (req, res) => { ... }
 * });
 */
export function createMethodHandler<T = unknown>(handlers: MethodHandlers<T>) {
  return withHandler<T>(async (req: NextApiRequest, res: NextApiResponse<ApiResponse<T>>) => {
    const method = req.method as HttpMethod;
    const handler = handlers[method];
    
    if (!handler) {
      // Set allowed methods header for client reference
      const allowedMethods = Object.keys(handlers).filter(m => handlers[m as HttpMethod]);
      res.setHeader('Allow', allowedMethods.join(', '));
      
      throw new AppError(
        `Method ${method} not allowed`,
        405
      );
    }
    
    // Execute the method-specific handler
    await handler(req, res);
  });
}

/**
 * Creates a GET-only handler for read-only endpoints
 * @param handler - GET request handler
 * @returns Configured Next.js API handler
 */
export function createGetHandler<T = unknown>(handler: RequestHandler<T>) {
  return createMethodHandler<T>({ GET: handler });
}

/**
 * Creates a POST-only handler for creation endpoints
 * @param handler - POST request handler
 * @returns Configured Next.js API handler
 */
export function createPostHandler<T = unknown>(handler: RequestHandler<T>) {
  return createMethodHandler<T>({ POST: handler });
}

/**
 * Creates handlers for CRUD operations on a resource
 * @param handlers - CRUD operation handlers
 * @returns Configured Next.js API handler
 */
export function createCrudHandler<T = unknown>(handlers: {
  list?: RequestHandler<T[]>;      // GET for listing resources
  create?: RequestHandler<T>;      // POST for creating resources
  read?: RequestHandler<T>;        // GET for reading single resource
  update?: RequestHandler<T>;      // PUT for updating resources
  delete?: RequestHandler<T>;      // DELETE for removing resources
}) {
  const methodHandlers: MethodHandlers<T | T[]> = {};
  
  if (handlers.list) methodHandlers.GET = handlers.list;
  if (handlers.create) methodHandlers.POST = handlers.create;
  if (handlers.read && !handlers.list) methodHandlers.GET = handlers.read;
  if (handlers.update) methodHandlers.PUT = handlers.update;
  if (handlers.delete) methodHandlers.DELETE = handlers.delete;
  
  return createMethodHandler(methodHandlers);
}

/**
 * Helper function to create standardized success responses
 * @param data - Response data
 * @param message - Optional success message
 * @param meta - Optional metadata
 * @returns Formatted success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  meta?: Record<string, unknown>
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta
  };
}

/**
 * Helper function to send success response
 * @param res - Next.js response object
 * @param data - Response data
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendSuccess<T>(
  res: NextApiResponse<ApiResponse<T>>,
  data?: T,
  message?: string,
  statusCode: number = 200
): void {
  res.status(statusCode).json(createSuccessResponse(data, message));
}

/**
 * Helper function to send created response (201)
 * @param res - Next.js response object
 * @param data - Created resource data
 * @param message - Optional success message
 */
export function sendCreated<T>(
  res: NextApiResponse<ApiResponse<T>>,
  data: T,
  message?: string
): void {
  sendSuccess(res, data, message || 'Resource created successfully', 201);
}

/**
 * Helper function to send no content response (204)
 * @param res - Next.js response object
 */
export function sendNoContent(res: NextApiResponse): void {
  res.status(204).end();
}

/**
 * Helper function to create paginated list responses
 * @param res - Next.js response object
 * @param data - Array of items
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param message - Optional message
 */
export function sendPaginatedResponse<T>(
  res: NextApiResponse<ApiResponse<T[]>>,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): void {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  res.status(200).json({
    success: true,
    data,
    message,
    meta: {
      page,
      limit,
      total,
      hasNext,
      hasPrev,
      totalPages
    }
  });
}

/**
 * Higher-order function that adds authentication to any handler
 * @param handler - Handler function to protect
 * @returns Protected handler with authentication
 */
export function withAuthRequired<T = unknown>(handler: RequestHandler<T>): RequestHandler<T> {
  return async (req: NextApiRequest, res: NextApiResponse<ApiResponse<T>>) => {
    // This would integrate with your auth system
    // For now, we'll use the existing CRON_SECRET approach
    const { auth, config } = await import('../config');
    const expectedSecret = auth.cronSecret;
    const isDevelopment = config.isDevelopment;
    
    if (!isDevelopment) {
      if (!expectedSecret) {
        throw new AppError('Service configuration error', 503);
      }
      
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== expectedSecret) {
        throw new AuthenticationError();
      }
    }
    
    return handler(req, res);
  };
}

/**
 * Higher-order function that validates request body schema
 * @param schema - Validation schema function
 * @param handler - Handler function
 * @returns Handler with request validation
 */
export function withValidation<T = unknown>(
  schema: (body: unknown) => { isValid: boolean; errors?: string[] },
  handler: RequestHandler<T>
): RequestHandler<T> {
  return async (req: NextApiRequest, res: NextApiResponse<ApiResponse<T>>) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const validation = schema(req.body);
      if (!validation.isValid) {
        throw new ValidationError(
          `Request validation failed: ${validation.errors?.join(', ')}`
        );
      }
    }
    
    return handler(req, res);
  };
}

/**
 * Creates a handler for action-based endpoints (non-CRUD operations)
 * @param action - Action handler function
 * @param method - HTTP method (default: POST)
 * @returns Configured action handler
 * 
 * @example
 * // For endpoints like /api/sources/fetch
 * export default createActionHandler(async (req, res) => {
 *   const result = await fetchAllSources();
 *   sendSuccess(res, result, 'All sources fetched successfully');
 * });
 */
export function createActionHandler<T = unknown>(
  action: RequestHandler<T>,
  method: HttpMethod = 'POST'
) {
  return createMethodHandler<T>({ [method]: action });
}

/**
 * Creates a batch operation handler
 * @param batchHandler - Handler for batch operations
 * @returns Configured batch handler
 */
export function createBatchHandler<T = unknown>(batchHandler: RequestHandler<T>) {
  return createActionHandler(batchHandler, 'POST');
}

/**
 * Utility type for extracting resource ID from request
 */
export type ResourceIdHandler<T = unknown> = (
  req: NextApiRequest & { resourceId: string },
  res: NextApiResponse<ApiResponse<T>>
) => Promise<void>;

/**
 * Higher-order function that extracts and validates resource ID from request
 * @param handler - Handler that expects resourceId in request
 * @param idParamName - Name of the ID parameter (default: 'id')
 * @returns Handler with resource ID validation
 */
export function withResourceId<T = unknown>(
  handler: ResourceIdHandler<T>,
  idParamName: string = 'id'
): RequestHandler<T> {
  return async (req: NextApiRequest, res: NextApiResponse<ApiResponse<T>>) => {
    const id = req.query[idParamName];
    
    if (!id || Array.isArray(id)) {
      throw new ValidationError(`Missing or invalid ${idParamName} parameter`);
    }
    
    // Add resourceId to request object
    const enhancedReq = req as NextApiRequest & { resourceId: string };
    enhancedReq.resourceId = id;
    
    return handler(enhancedReq, res);
  };
}
