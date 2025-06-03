// File: lib/api/controllers/bulkSourcesController.ts
// Purpose: Controllers for bulk operations on sources including processing all sources

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../db';
import Source from '../../../models/Source';
import { createSuccessResponse, createErrorResponse } from '../utils';
import { RequestHandler } from '../types';
import { OverallFetchRunResult } from '../../types';

/**
 * Batch operations on sources (enable/disable multiple sources)
 */
export const batchOperations: RequestHandler<{ success: boolean; updated: number }> = async (req, res) => {
  await dbConnect();

  const { operation, sourceIds } = req.body;

  if (!operation || !sourceIds || !Array.isArray(sourceIds)) {
    return res.status(400).json(
      createErrorResponse('operation and sourceIds array are required')
    );
  }

  if (sourceIds.length === 0) {
    return res.status(400).json(
      createErrorResponse('sourceIds array cannot be empty')
    );
  }

  try {
    let updateQuery: Record<string, unknown> = {};

    switch (operation) {
      case 'enable':
        updateQuery = { isEnabled: true, updatedAt: new Date() };
        break;
      case 'disable':
        updateQuery = { isEnabled: false, updatedAt: new Date() };
        break;
      default:
        return res.status(400).json(
          createErrorResponse('Invalid operation. Supported operations: enable, disable')
        );
    }

    const result = await Source.updateMany(
      { _id: { $in: sourceIds } },
      updateQuery
    );

    res.status(200).json(
      createSuccessResponse(
        { success: true, updated: result.modifiedCount },
        `Batch ${operation} operation completed`
      )
    );

  } catch (error) {
    console.error('Error in batch operation:', error);
    throw error;
  }
};

/**
 * Process all enabled sources to fetch articles from all sources at once
 */
export const processBulkSources: RequestHandler<OverallFetchRunResult> = async (req, res) => {
  console.log('Bulk Sources Controller: Starting bulk processing request...');

  try {
    // Import the bulk processor function
    const { processBulkSources } = await import('../../jobs/articleFetching/bulkSourcesOrchestrator');
    
    const result = await processBulkSources();
    
    console.log(`Bulk Sources Controller: Bulk processing complete. Added ${result.totalNewArticlesAddedAcrossAllSources} new articles.`);
    
    res.status(200).json(
      createSuccessResponse(result, 'Bulk sources processing completed')
    );

  } catch (error) {
    console.error('Bulk Sources Controller: Error in bulk processing:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(
      createErrorResponse(`Failed to process bulk sources: ${errorMessage}`)
    );
  }
};

/**
 * Process all enabled sources with authorization - specifically for scrape-all API
 * Returns raw OverallFetchRunResult for backward compatibility
 */
export const processBulkSourcesWithAuth = async (
  req: NextApiRequest, 
  res: NextApiResponse<OverallFetchRunResult | { error: string; message?: string }>
) => {
  const { auth } = await import('../../config');
  const expectedSecret = auth.cronSecret;
  const { config } = await import('../../config');
  const isDevelopment = config.isDevelopment;

  // Authorization Check
  if (!isDevelopment) {
    if (!expectedSecret) {
      console.error('API /api/sources/scrape-all: CRITICAL - CRON_SECRET is not set in this environment. Denying access.');
      return res.status(503).json({ error: 'Service unavailable due to server configuration error.' });
    }
    
    // Check for Vercel cron secret - it comes in the authorization header
    const authHeader = req.headers.authorization as string;
    const providedSecret = authHeader?.replace('Bearer ', '') || null;
    
    if (providedSecret !== expectedSecret) {
      console.warn(`API /api/sources/scrape-all: Unauthorized attempt. Expected secret but received: [${providedSecret ? 'provided_secret_hidden' : 'nothing'}]`);
      console.warn(`Auth header:`, authHeader ? 'present' : 'missing');
      console.warn(`Headers received:`, Object.keys(req.headers));
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('API /api/sources/scrape-all: Authorized via authorization header.');

  } else {
    console.log('API /api/sources/scrape-all: Authorization check skipped in development mode.');
  }

  console.log(`API /api/sources/scrape-all: Processing ${req.method} request.`);
  
  try {
    await dbConnect();
    
    // Import the bulk processor function
    const { processBulkSources } = await import('../../jobs/articleFetching/bulkSourcesOrchestrator');
    
    const result = await processBulkSources();
    
    console.log(`API /api/sources/scrape-all: Bulk processing complete. Added ${result.totalNewArticlesAddedAcrossAllSources} new articles.`);
    
    return res.status(200).json(result);

  } catch (error: unknown) {
    console.error('API /api/sources/scrape-all CRITICAL ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      error: 'Failed to execute scrape-all-sources process.', 
      message: errorMessage 
    });
  }
};
