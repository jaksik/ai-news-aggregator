/**
 * Common validation utilities for API endpoints
 * Eliminates repetitive validation code across all API routes
 */

import mongoose from 'mongoose';
import type { NextApiRequest } from 'next';
import { ApiErrorResponse, ApiSuccessResponse, ResponseMeta } from './types';
import { ValidationError } from '../errors/errorHandler';

/**
 * Validates MongoDB ObjectId format
 * @param id - The ID to validate
 * @param resourceName - Name of the resource for error messages
 * @throws ValidationError if ID is invalid
 */
export function validateObjectId(id: string | string[] | undefined, resourceName: string): string {
  if (!id || Array.isArray(id)) {
    throw new ValidationError(`Invalid or missing ${resourceName} ID in request`);
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${resourceName} ID format`);
  }
  
  return id;
}

/**
 * Validates required fields in request body
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @throws ValidationError if any required fields are missing
 */
export function validateRequiredFields(body: Record<string, unknown>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => 
    body[field] === undefined || body[field] === null || body[field] === ''
  );
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      {
        additionalData: { 
          missingFields,
          requiredFields 
        }
      }
    );
  }
}

/**
 * Validates enum values
 * @param value - Value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if value is not in allowed values
 */
export function validateEnum<T extends string>(
  value: unknown, 
  allowedValues: T[], 
  fieldName: string
): T {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}`,
      {
        additionalData: { 
          received: value,
          allowedValues 
        }
      }
    );
  }
  return value as T;
}

/**
 * Validates and parses integer parameters
 * @param value - String value to parse
 * @param fieldName - Name of the field for error messages
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Parsed integer
 * @throws ValidationError if value is not a valid integer or out of range
 */
export function validateInteger(
  value: string | undefined, 
  fieldName: string, 
  min?: number, 
  max?: number
): number | undefined {
  if (value === undefined) return undefined;
  
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid integer`);
  }
  
  if (min !== undefined && parsed < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  
  if (max !== undefined && parsed > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }
  
  return parsed;
}

/**
 * Validates URL format
 * @param url - URL string to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if URL is invalid
 */
export function validateUrl(url: string, fieldName: string): void {
  try {
    new URL(url);
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`, {
      additionalData: { received: url }
    });
  }
}

/**
 * Validates boolean parameters from query strings
 * @param value - String value to parse
 * @param fieldName - Name of the field for error messages
 * @returns Boolean value or undefined
 */
export function validateBoolean(value: string | undefined, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  
  const lowercaseValue = value.toLowerCase();
  if (lowercaseValue === 'true') return true;
  if (lowercaseValue === 'false') return false;
  
  throw new ValidationError(`${fieldName} must be 'true' or 'false'`, {
    additionalData: { received: value }
  });
}

/**
 * Validates date string format
 * @param dateString - Date string to validate
 * @param fieldName - Name of the field for error messages
 * @returns Date object
 * @throws ValidationError if date is invalid
 */
export function validateDate(dateString: string, fieldName: string): Date {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`, {
      additionalData: { received: dateString }
    });
  }
  
  return date;
}

/**
 * Sanitizes and validates pagination parameters
 * @param query - Query parameters object
 * @returns Validated pagination parameters
 */
export function validatePagination(query: Record<string, unknown>) {
  const page = validateInteger(query.page as string, 'page', 1) || 1;
  const limit = validateInteger(query.limit as string, 'limit', 1, 1000) || 50;
  
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Validates sort parameters
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort direction
 * @param allowedFields - Array of allowed sort fields
 * @returns Validated sort parameters
 */
export function validateSort(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  allowedFields: string[]
) {
  const sort = sortBy || allowedFields[0]; // Default to first allowed field
  const order = validateEnum(sortOrder || 'desc', ['asc', 'desc'], 'sortOrder');
  
  if (!allowedFields.includes(sort)) {
    throw new ValidationError(
      `Invalid sort field. Must be one of: ${allowedFields.join(', ')}`,
      {
        additionalData: { 
          received: sort,
          allowedFields 
        }
      }
    );
  }
  
  return { sort, order, sortQuery: { [sort]: order === 'asc' ? 1 : -1 } };
}

/**
 * Creates a standardized success response
 * @param data - Response data
 * @param message - Success message
 * @param meta - Additional metadata
 * @returns Formatted success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  meta?: ResponseMeta
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      ...meta,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Creates a standardized error response
 * @param message - Error message
 * @param details - Additional error details
 * @param statusCode - HTTP status code
 * @returns Formatted error response
 */
export function createErrorResponse(
  message: string,
  details?: string | Record<string, unknown>,
  statusCode?: number
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  if (typeof details === 'string') {
    response.details = details;
  } else if (details) {
    response.errors = details;
  }

  if (statusCode) {
    response.statusCode = statusCode;
  }

  return response;
}

/**
 * Creates a standardized error response (deprecated - use ErrorResponseFormatter instead)
 * @param error - Error object or AppError
 * @returns Formatted error response
 * @deprecated Use ErrorResponseFormatter.formatErrorResponse() from ../errors/errorHandler
 */
export function formatErrorResponse(error: unknown): ApiErrorResponse {
  // Import the centralized formatter
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ErrorResponseFormatter } = require('../errors/errorHandler');
  return ErrorResponseFormatter.formatErrorResponse(error);
}

/**
 * Extracts client IP address from request
 * @param req - Next.js API request object
 * @returns Client IP address
 */
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded?.[0];
  
  return (
    forwardedIp ||
    req.headers['x-real-ip'] as string ||
    (req as unknown as { connection?: { remoteAddress?: string } }).connection?.remoteAddress ||
    (req as unknown as { socket?: { remoteAddress?: string } }).socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Generates a unique request ID for tracking
 * @returns Unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
