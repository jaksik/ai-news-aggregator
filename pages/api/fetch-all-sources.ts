// File: pages/api/fetch-all-sources.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import { processAllEnabledSources, OverallFetchRunResult } from '../../lib/services/fetcher';

type ResponseData = OverallFetchRunResult | { error: string; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === 'POST') {
    const expectedSecret = process.env.CRON_SECRET;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isDevelopment && expectedSecret) {
      // In non-development (production/preview), and if CRON_SECRET is set,
      // we expect Vercel to provide the 'x-vercel-cron-secret' header.
      const providedVercelCronSecret = req.headers['x-vercel-cron-secret'];
      
      if (providedVercelCronSecret !== expectedSecret) {
        console.warn('API /api/fetch-all-sources: Unauthorized. Vercel cron secret mismatch or missing from request.');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else if (isDevelopment) {
      // In development, allow requests (e.g., from your UI button) without the Vercel-specific header.
      // You might still have process.env.CRON_SECRET set in .env.local for other testing.
      console.log('API /api/fetch-all-sources: Authorization check for x-vercel-cron-secret skipped in development mode.');
    } else if (!expectedSecret && !isDevelopment) {
      // This case means it's production/preview but CRON_SECRET is NOT set in environment variables. This is a security risk.
      console.error('API /api/fetch-all-sources: CRITICAL - CRON_SECRET environment variable is not set in this environment. Endpoint is potentially insecure if called directly.');
      // Depending on your security policy, you might want to deny access here:
      // return res.status(500).json({ error: 'Server configuration error: CRON_SECRET missing.' });
    }

    console.log('API /api/fetch-all-sources: Received authorized POST request.');
    try {
      await dbConnect();
      const result = await processAllEnabledSources();
      console.log(`API /api/fetch-all-sources: Orchestration complete. Added ${result.totalNewArticlesAddedAcrossAllSources} new articles.`);
      return res.status(200).json(result);
    } catch (error: unknown) {
      console.error('API /api/fetch-all-sources CRITICAL ERROR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(500).json({ 
        error: 'Failed to execute fetch-all-sources process.', 
        message: errorMessage 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}