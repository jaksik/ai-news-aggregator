import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { runAiCategorizationJob } from '../../../lib/jobs/aIArticleCategorizing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract optional parameters from request body
    const { limit = 10 } = req.body;

    // Validate limit parameter
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      return res.status(400).json({ 
        error: 'Invalid limit parameter. Must be a number between 1 and 100.' 
      });
    }

    console.log(`Starting AI categorization batch job for ${limit} articles...`);

    // Import configuration
    const { ai } = await import('../../../lib/config');
    const openaiApiKey = ai.openaiApiKey;
    
    if (!openaiApiKey) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured' 
      });
    }

    // Run the AI categorization job
    const result = await runAiCategorizationJob(openaiApiKey, limit);

    console.log('AI categorization batch job completed:', result);

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${result.totalProcessed} articles`,
      details: {
        processed: result.totalProcessed,
        successful: result.successfulUpdates,
        failed: result.failedUpdates,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('Error in AI categorization batch job:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
