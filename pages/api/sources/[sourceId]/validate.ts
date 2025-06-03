// File: pages/api/sources/[sourceId]/validate.ts
// Purpose: Validate source configuration and connectivity

import { createMethodHandler } from '../../../../lib/api/routeHandlerFactory';
import dbConnect from '../../../../lib/mongodb';
import Source from '../../../../models/Source';
import { createSuccessResponse, createErrorResponse } from '../../../../lib/api/utils';
import { RequestHandler } from '../../../../lib/api/types';

interface ValidationResult {
  sourceId: string;
  sourceName: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  responseTime?: number;
  validationTime?: number;
}

/**
 * Validate a specific source configuration
 */
const validateSource: RequestHandler<ValidationResult> = async (req, res) => {
  await dbConnect();

  const { sourceId } = req.query;

  if (!sourceId || typeof sourceId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Source ID is required')
    );
  }

  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get the source
    const source = await Source.findById(sourceId).lean();

    if (!source) {
      return res.status(404).json(
        createErrorResponse('Source not found')
      );
    }

    // Basic validation
    if (!source.url) {
      errors.push('Source URL is required');
    } else {
      try {
        new URL(source.url);
      } catch {
        errors.push('Invalid URL format');
      }
    }

    if (!source.name) {
      errors.push('Source name is required');
    }

    if (!source.type) {
      errors.push('Source type is required');
    } else if (!['rss', 'html'].includes(source.type)) {
      errors.push('Invalid source type. Must be "rss" or "html"');
    }

    // Type-specific validation
    if (source.type === 'html') {
      if (!source.websiteId) {
        errors.push('Website ID is required for HTML sources');
      }
    }

    // Connectivity test (basic URL accessibility)
    let responseTime: number | undefined;
    if (source.url && errors.length === 0) {
      try {
        const testStartTime = Date.now();
        const response = await fetch(source.url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
          }
        });
        responseTime = Date.now() - testStartTime;

        if (!response.ok) {
          warnings.push(`URL returned ${response.status} ${response.statusText}`);
        }

        if (responseTime > 5000) {
          warnings.push('Source response time is slow (>5 seconds)');
        }
      } catch (error) {
        errors.push(`Failed to connect to source: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const result: ValidationResult = {
      sourceId,
      sourceName: source.name,
      valid: errors.length === 0,
      errors,
      warnings,
      responseTime,
      validationTime: Date.now() - startTime
    };

    res.status(200).json(
      createSuccessResponse(result, 'Source validation completed')
    );

  } catch (error) {
    console.error(`Error validating source ${sourceId}:`, error);
    
    const result: ValidationResult = {
      sourceId,
      sourceName: 'Unknown',
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      warnings: []
    };

    res.status(500).json(
      createSuccessResponse(result, 'Source validation failed')
    );
  }
};

export default createMethodHandler({
  GET: validateSource,
  POST: validateSource
});
