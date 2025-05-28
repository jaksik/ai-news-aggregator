import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb'; // Not strictly needed if processAllEnabledSources connects, but good for consistency
import { processAllEnabledSources, OverallFetchRunResult } from '../../lib/services/fetcher';

type ResponseData = OverallFetchRunResult | { error: string; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // This endpoint should ideally be protected if it's public-facing,
  // or only called by your cron job. For now, we'll allow POST.
  if (req.method === 'POST') {
    console.log('API /api/fetch-all-sources: Received POST request.');
    try {
      // Optional: await dbConnect(); // processAllEnabledSources will also call it.
      
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