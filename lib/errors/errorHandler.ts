/**
 * Centralized Error Handling System
 * Provides unified error handling, logging, and response formatting across the application
 */

import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { ApiResponse } from '../api/types';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better classification
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  RATE_LIMIT = 'rate_limit'
}

// Base error interface
export interface ErrorContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

// Enhanced error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly context: ErrorContext;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    context: ErrorContext = {},
    originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.category = category;
    this.severity = severity;
    this.isOperational = isOperational;
    this.context = {
      ...context,
      timestamp: new Date().toISOString()
    };
    this.originalError = originalError;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}, originalError?: unknown) {
    super(message, 400, ErrorCategory.VALIDATION, ErrorSeverity.LOW, true, context, originalError);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context: ErrorContext = {}) {
    super(message, 401, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context: ErrorContext = {}) {
    super(message, 403, ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context: ErrorContext = {}) {
    super(`${resource} not found`, 404, ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.LOW, true, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 409, ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.LOW, true, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context: ErrorContext = {}) {
    super(message, 429, ErrorCategory.RATE_LIMIT, ErrorSeverity.MEDIUM, true, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context: ErrorContext = {}, originalError?: unknown) {
    super(message, 500, ErrorCategory.DATABASE, ErrorSeverity.HIGH, true, context, originalError);
  }
}

export class ExternalApiError extends AppError {
  constructor(message: string, statusCode: number = 502, context: ErrorContext = {}, originalError?: unknown) {
    super(message, statusCode, ErrorCategory.EXTERNAL_API, ErrorSeverity.MEDIUM, true, context, originalError);
  }
}

export class SystemError extends AppError {
  constructor(message: string, context: ErrorContext = {}, originalError?: unknown) {
    super(message, 500, ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, false, context, originalError);
  }
}

// Error logging utility
export class ErrorLogger {
  private static logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      category: error.category,
      severity: error.severity,
      isOperational: error.isOperational,
      context: error.context,
      stack: error.stack,
      originalError: error.originalError
    };

    // Log to appropriate level
    switch (logLevel) {
      case 'error':
        console.error('Application Error:', logData);
        break;
      case 'warn':
        console.warn('Application Warning:', logData);
        break;
      case 'info':
        console.info('Application Info:', logData);
        break;
      default:
        console.log('Application Log:', logData);
    }

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.CRITICAL) {
      // TODO: Integrate with external logging service (e.g., Sentry, LogRocket)
      this.sendToCriticalAlerting(error);
    }
  }

  private static getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  private static sendToCriticalAlerting(error: AppError): void {
    // Placeholder for critical error alerting
    // In production, implement integration with monitoring service
    console.error('CRITICAL ERROR ALERT:', {
      message: error.message,
      context: error.context,
      timestamp: new Date().toISOString()
    });
  }

  public static log(error: AppError): void {
    this.logError(error);
  }
}

// Error response formatter
export class ErrorResponseFormatter {
  public static formatErrorResponse<T>(error: unknown): ApiResponse<T> {
    // Handle AppError instances
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        meta: {
          timestamp: error.context.timestamp || new Date().toISOString(),
          requestId: error.context.requestId,
          category: error.category,
          ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            originalError: error.originalError
          })
        }
      };
    }

    // Handle Mongoose validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors: Record<string, string> = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });

      return {
        success: false,
        error: 'Validation failed',
        meta: {
          timestamp: new Date().toISOString(),
          category: ErrorCategory.VALIDATION,
          details: `Validation errors: ${JSON.stringify(validationErrors)}`
        }
      };
    }

    // Handle MongoDB duplicate key errors
    if (this.isMongoDbDuplicateKeyError(error)) {
      return {
        success: false,
        error: 'Duplicate entry',
        meta: {
          timestamp: new Date().toISOString(),
          category: ErrorCategory.DATABASE
        }
      };
    }

    // Handle Mongoose cast errors
    if (error instanceof mongoose.Error.CastError) {
      return {
        success: false,
        error: 'Invalid ID format',
        meta: {
          timestamp: new Date().toISOString(),
          category: ErrorCategory.VALIDATION
        }
      };
    }

    // Handle generic errors
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: 'Internal server error',
      meta: {
        timestamp: new Date().toISOString(),
        category: ErrorCategory.SYSTEM,
        ...(process.env.NODE_ENV === 'development' && {
          details: message,
          stack: error instanceof Error ? error.stack : undefined
        })
      }
    };
  }

  private static isMongoDbDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }
}

// Main error handler for API routes
export class ErrorHandler {
  public static async handleError<T>(
    error: unknown,
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<T>>
  ): Promise<void> {
    // Create context from request
    const context: ErrorContext = {
      requestId: (req as NextApiRequest & { requestId?: string }).requestId,
      endpoint: req.url,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIp(req),
      timestamp: new Date().toISOString()
    };

    let appError: AppError;

    // Convert unknown errors to AppError
    if (error instanceof AppError) {
      appError = error;
      // Create new error with merged context if needed
      if (Object.keys(context).length > 0) {
        appError = new AppError(
          appError.message,
          appError.statusCode,
          appError.category,
          appError.severity,
          appError.isOperational,
          { ...context, ...appError.context },
          appError.originalError
        );
      }
    } else {
      // Create new AppError from unknown error
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      appError = new AppError(
        message,
        500,
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        false,
        context,
        error
      );
    }

    // Log the error
    ErrorLogger.log(appError);

    // Format and send response
    const response = ErrorResponseFormatter.formatErrorResponse<T>(appError);
    const statusCode = appError.statusCode || 500;

    // Set appropriate headers
    if (statusCode === 429) {
      res.setHeader('Retry-After', '60'); // Retry after 60 seconds for rate limits
    }

    res.status(statusCode).json(response);
  }

  public static createContext(req: NextApiRequest, additionalData?: Record<string, unknown>): ErrorContext {
    return {
      requestId: (req as NextApiRequest & { requestId?: string }).requestId,
      endpoint: req.url,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIp(req),
      timestamp: new Date().toISOString(),
      additionalData
    };
  }

  private static getClientIp(req: NextApiRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}

// Utility functions for common error scenarios
export const createValidationError = (message: string, context?: ErrorContext) => 
  new ValidationError(message, context);

export const createNotFoundError = (resource: string, context?: ErrorContext) => 
  new NotFoundError(resource, context);

export const createAuthError = (message?: string, context?: ErrorContext) => 
  new AuthenticationError(message, context);

export const createDatabaseError = (message: string, context?: ErrorContext, originalError?: unknown) => 
  new DatabaseError(message, context, originalError);

export const createExternalApiError = (message: string, statusCode?: number, context?: ErrorContext, originalError?: unknown) => 
  new ExternalApiError(message, statusCode, context, originalError);

// Export everything needed for error handling
export default ErrorHandler;
