// API endpoint for categorization runs
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/db';
import CategorizationRunLog from '../../../models/CategorizationRunLog';
import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';

async function getCategorizationRuns(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { 
    page = '1', 
    limit = '10', 
    status,
    triggeredBy 
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter: Record<string, unknown> = {};
  if (status && status !== 'all') {
    filter.status = status;
  }
  if (triggeredBy && triggeredBy !== 'all') {
    filter.triggeredBy = triggeredBy;
  }

  try {
    const [runs, total] = await Promise.all([
      CategorizationRunLog.find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-articleSummaries') // Exclude detailed summaries for list view
        .lean(),
      CategorizationRunLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        runs,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRuns: total,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Failed to fetch categorization runs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categorization runs'
    });
  }
}

async function triggerCategorizationRun(req: NextApiRequest, res: NextApiResponse) {
  const { articleLimit = 20 } = req.body;

  try {
    // Import the orchestrator dynamically to avoid circular dependencies
    const { runAiCategorizationJob } = await import('../../../lib/jobs/aIArticleCategorizing');
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    // Start the categorization job
    const result = await runAiCategorizationJob(openaiApiKey, articleLimit, 'manual');

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Failed to trigger categorization run:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger categorization run'
    });
  }
}

export default createMethodHandler({
  GET: getCategorizationRuns,
  POST: triggerCategorizationRun
});
