// File: lib/api/routeHandlerFactory.ts
// Purpose: Factory for creating standardized API route handlers with method-based routing

import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from './types';
import { createSuccessResponse, createErrorResponse } from './utils';
import { withHandler } from './middleware';

export type ApiHandler<TData = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<TData>>
) => Promise<void> | void;

export interface MethodHandlers {
  GET?: ApiHandler<unknown>;
  POST?: ApiHandler<unknown>;
  PUT?: ApiHandler<unknown>;
  DELETE?: ApiHandler<unknown>;
  PATCH?: ApiHandler<unknown>;
}

export interface RouteOptions {
  requireAuth?: boolean;
  validateSchema?: Record<string, unknown>;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Creates a standardized API route handler with method-based routing
 */
export function createMethodHandler(
  handlers: MethodHandlers
): ApiHandler<unknown> {
  return withHandler(async (req: NextApiRequest, res: NextApiResponse<ApiResponse<unknown>>) => {
    // Get the appropriate handler for the HTTP method
    const method = req.method as keyof MethodHandlers;
    const handler = handlers[method];

    if (!handler) {
      const allowedMethods = Object.keys(handlers).join(', ');
      res.setHeader('Allow', allowedMethods);
      return res.status(405).json(
        createErrorResponse(`Method ${req.method} Not Allowed`, {
          allowedMethods: Object.keys(handlers)
        })
      );
    }

    // Execute the handler
    await handler(req, res);
  });
}

/**
 * Creates a standardized resource handler with CRUD operations
 */
export function createResourceHandler(
  handlers: {
    list?: ApiHandler<unknown>;
    create?: ApiHandler<unknown>;
    read?: ApiHandler<unknown>;
    update?: ApiHandler<unknown>;
    delete?: ApiHandler<unknown>;
  }
): MethodHandlers {
  return {
    GET: handlers.list || handlers.read,
    POST: handlers.create,
    PUT: handlers.update,
    DELETE: handlers.delete
  };
}

/**
 * Helper for creating paginated responses
 */
export function createPaginatedHandler(
  fetchData: (req: NextApiRequest) => Promise<{ data: unknown[]; total: number }>
): ApiHandler<unknown> {
  return async (req: NextApiRequest, res: NextApiResponse<ApiResponse<unknown>>) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Add pagination to request for handler use
      (req as NextApiRequest & { pagination?: { page: number; limit: number; offset: number } }).pagination = { page, limit, offset };

      const { data, total } = await fetchData(req);
      const totalPages = Math.ceil(total / limit);

      const response = createSuccessResponse(data, 'Data retrieved successfully', {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

      res.status(200).json(response);
    } catch (error) {
      console.error('Paginated handler error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      res.status(500).json(createErrorResponse(errorMessage));
    }
  };
}
