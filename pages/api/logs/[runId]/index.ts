// File: pages/api/logs/[runId]/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import FetchRunLog, { IFetchRunLog } from '../../../../models/FetchRunLog';

type Data = {
  log?: IFetchRunLog;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { runId } = req.query;

  // Validate the runId from the query
  if (!runId || Array.isArray(runId) || !mongoose.Types.ObjectId.isValid(runId as string)) {
    return res.status(400).json({ error: 'Invalid or missing run ID in URL path.' });
  }
  const idToFetch = runId as string;

  // Ensure Database Connection
  try {
    await dbConnect();
  } catch (error: unknown) {
    console.error(`API /api/logs/${idToFetch} - DB Connection Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return res.status(500).json({ error: 'Database connection failed', message: errorMessage });
  }

  // Handle GET request to fetch a single log by its ID
  if (req.method === 'GET') {
    try {
      console.log(`API /api/logs/${idToFetch}: Attempting to find log by ID.`);
      const log = await FetchRunLog.findById(idToFetch).lean();

      if (!log) {
        console.log(`API /api/logs/${idToFetch}: Log not found.`);
        return res.status(404).json({ error: 'Fetch run log not found with the provided ID.' });
      }

      console.log(`API /api/logs/${idToFetch}: Log found.`);
      res.status(200).json({ log: log as IFetchRunLog });

    } catch (error: unknown) {
      console.error(`API /api/logs/${idToFetch} GET Error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to fetch log details from database', message: errorMessage });
    }
  } else {
    // Handle other HTTP methods
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed on /api/logs/${idToFetch}` });
  }
}
