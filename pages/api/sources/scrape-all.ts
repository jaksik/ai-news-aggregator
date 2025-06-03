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
import { processBulkSourcesWithAuth } from '../../../lib/api/controllers/bulkSourcesController';
import { OverallFetchRunResult } from '../../../lib/types';

type ResponseData = OverallFetchRunResult | { error: string; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Allow GET for Vercel Cron and POST for UI button/other triggers
  if (req.method === 'GET' || req.method === 'POST') {
    return processBulkSourcesWithAuth(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
