import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import { processAllEnabledSources, OverallFetchRunResult } from '../../lib/services/fetcher';

type ResponseData = OverallFetchRunResult | { error: string; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === 'POST') {
    // --- Authorization Check ---
    const expectedSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization; // Expect "Bearer YOUR_SECRET"
    let providedSecret: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedSecret = authHeader.substring(7); // Extract token after "Bearer "
    } else if (req.query.cron_secret) {
      // Fallback or alternative: check query parameter (less secure for secrets in URLs)
      providedSecret = req.query.cron_secret as string;
    }

    // If CRON_SECRET is set in .env.local, then we enforce the check
    if (expectedSecret && providedSecret !== expectedSecret) {
      console.warn('API /api/fetch-all-sources: Unauthorized attempt with invalid or missing secret.');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // If CRON_SECRET is NOT set in .env.local, we might allow requests for local dev/testing
    // OR you could make it strictly required always. For now, this allows it if not set.
    if (expectedSecret && !providedSecret) {
        console.warn('API /api/fetch-all-sources: Missing secret for protected endpoint.');
        // return res.status(401).json({ error: 'Unauthorized: Secret required' });
    }
    // --- End Authorization Check ---

    console.log('API /api/fetch-all-sources: Received authorized POST request.');
    try {
      await dbConnect();
      const result = await processAllEnabledSources();
      console.log(`API /api/fetch-all-sources: Orchestration complete. Added ${result.totalNewArticlesAddedAcrossAllSources} new articles.`);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('API /api/fetch-all-sources CRITICAL ERROR:', error);
      return res.status(500).json({ 
        error: 'Failed to execute fetch-all-sources process.', 
        message: error.message 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}