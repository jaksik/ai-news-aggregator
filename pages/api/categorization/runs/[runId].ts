// API endpoint for individual categorization run details
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/db';
import CategorizationRunLog from '../../../../models/CategorizationRunLog';
import { createMethodHandler } from '../../../../lib/api/routeHandlerFactory';

async function getCategorizationRun(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { runId } = req.query;

  if (!runId || typeof runId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Run ID is required'
    });
  }

  try {
    const run = await CategorizationRunLog.findById(runId).lean();

    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Categorization run not found'
      });
    }

    res.status(200).json({
      success: true,
      data: run
    });
  } catch (error) {
    console.error('Failed to fetch categorization run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categorization run'
    });
  }
}

export default createMethodHandler({
  GET: getCategorizationRun
});
