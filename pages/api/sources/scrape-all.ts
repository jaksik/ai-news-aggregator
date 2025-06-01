// File: pages/api/sources/scrape-all.ts
// Purpose: Serves as the main entry point for automated news aggregation, 
// allowing both scheduled cron jobs and manual admin triggers to scrape articles 
// from all enabled news sources at once.

// Flow: Cron/Manual Trigger → Validate Authorization → Process All Sources 
// → Return Aggregate Results

// Use Cases:
// Scheduled automated news gathering
// Manual "Scrape All" admin operations
// Bulk content updates

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import { processAllEnabledSources, OverallFetchRunResult } from '../../../lib/services/fetcher';

type ResponseData = OverallFetchRunResult | { error: string; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Allow GET for Vercel Cron and POST for UI button/other triggers
  if (req.method === 'GET' || req.method === 'POST') {
    const expectedSecret = process.env.CRON_SECRET;
    const isDevelopment = process.env.NODE_ENV === 'development';

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
      const result = await processAllEnabledSources();
      console.log(`API /api/sources/scrape-all: Orchestration complete. Added ${result.totalNewArticlesAddedAcrossAllSources} new articles.`);
      return res.status(200).json(result);
    } catch (error: unknown) {
      console.error('API /api/sources/scrape-all CRITICAL ERROR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(500).json({ 
        error: 'Failed to execute scrape-all-sources process.', 
        message: errorMessage 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
