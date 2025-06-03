/**
 * Middleware functions for API routes
 * Provides centralized error handling, authentication, and common functionality
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../db';
import { ApiResponse } from './types';
import { generateRequestId } from './utils';
import { ErrorHandler, SystemError, AuthenticationError } from '../errors/errorHandler';

/**
 * Higher-order function that wraps API handlers with common middleware
 * Provides database connection, error handling, and logging
 */
export function withHandler<T = unknown>(
  handler: (req: NextApiRequest, res: NextApiResponse<ApiResponse<T>>) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse<ApiResponse<T>>) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // Add request ID to request object for tracking
    (req as NextApiRequest & { requestId: string }).requestId = requestId;
    
    try {
      // Ensure database connection
      await ensureDbConnection();
      
      // Execute the handler
      await handler(req, res);
      
      // Log successful request
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ${req.method} ${req.url} - Success (${duration}ms)`);
      
    } catch (error) {
      // Use centralized error handler
      await ErrorHandler.handleError(error, req, res);
    }
  };
}

/**
 * Ensures database connection is established
 * @throws AppError if database connection fails
 */
export async function ensureDbConnection(): Promise<void> {
  try {
    await dbConnect();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw new SystemError(
      'Service temporarily unavailable - Database connection failed',
      undefined,
      error
    );
  }
}

/**
 * Authentication middleware for protected routes
 * Validates CRON_SECRET for automated requests
 */
export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return withHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    const { auth, config } = await import('../config');
    const expectedSecret = auth.cronSecret;
    const isDevelopment = config.isDevelopment;
    
    // Skip auth in development mode
    if (isDevelopment) {
      console.log('Authentication check skipped in development mode');
      return handler(req, res);
    }
    
    // Validate secret configuration
    if (!expectedSecret) {
      console.error('CRITICAL: CRON_SECRET is not set in environment variables');
      throw new SystemError('Service configuration error');
    }
    
    // Extract and validate authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }
    
    const providedSecret = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    if (providedSecret !== expectedSecret) {
      console.warn(`Unauthorized access attempt from ${req.headers['x-forwarded-for'] || 'unknown'}`);
      throw new AuthenticationError('Invalid authorization token');
    }
    
    console.log('Request authorized successfully');
    return handler(req, res);
  });
}

/**
 * CORS middleware for API routes
 */
export function withCors(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
  } = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const {
      origin = '*',
      methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders = ['Content-Type', 'Authorization']
    } = options;
    
    // Set CORS headers
    if (Array.isArray(origin)) {
      const requestOrigin = req.headers.origin;
      if (requestOrigin && origin.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', '3600');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return handler(req, res);
  };
}

/**
 * Rate limiting middleware (basic implementation)
 */
export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: {
    maxRequests?: number;
    windowMs?: number;
  } = {}
) {
  const {
    maxRequests = 100,
    windowMs = 15 * 60 * 1000 // 15 minutes
  } = options;
  
  // Simple in-memory store (use Redis in production)
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }
    
    // Get or create client record
    let clientRecord = requests.get(clientId as string);
    if (!clientRecord || now > clientRecord.resetTime) {
      clientRecord = { count: 0, resetTime: now + windowMs };
      requests.set(clientId as string, clientRecord);
    }
    
    // Check rate limit
    if (clientRecord.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        details: `Rate limit exceeded. Try again in ${Math.ceil((clientRecord.resetTime - now) / 1000)} seconds`
      });
    }
    
    // Increment request count
    clientRecord.count++;
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - clientRecord.count));
    res.setHeader('X-RateLimit-Reset', new Date(clientRecord.resetTime).toISOString());
    
    return handler(req, res);
  };
}

/**
 * Request logging middleware
 */
export function withLogging(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const requestId = (req as NextApiRequest & { requestId?: string }).requestId || generateRequestId();
    
    // Log request start
    const logData: Record<string, unknown> = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    };
    
    // Don't log request body for security/performance reasons
    
    console.log(`[${requestId}] Request started:`, logData);
    
    try {
      await handler(req, res);
      
      // Log successful completion
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Request completed successfully in ${duration}ms`);
      
    } catch (error) {
      // Log error (error will be handled by withHandler)
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] Request failed after ${duration}ms:`, error);
      throw error;
    }
  };
}

/**
 * Request size limit middleware
 */
export function withSizeLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        details: `Request size ${contentLength} bytes exceeds limit of ${maxSizeBytes} bytes`
      });
    }
    
    return handler(req, res);
  };
}
