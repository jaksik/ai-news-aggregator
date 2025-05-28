import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb'; // Your Mongoose connection utility
import FetchRunLog, { IFetchRunLog } from '../../models/FetchRunLog'; // Your FetchRunLog Mongoose model

// Define a type for the response data
type Data = {
  logs?: IFetchRunLog[];
  totalLogs?: number;
  page?: number;
  limit?: number;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Ensure database connection
  try {
    await dbConnect();
  } catch (error: any) {
    console.error('API /api/fetch-logs - DB Connection Error:', error);
    return res.status(500).json({ error: 'Database connection failed', message: error.message });
  }

  if (req.method === 'GET') {
    try {
      // Basic Pagination parameters from query string
      // Example: /api/fetch-logs?page=1&limit=10
      const page = parseInt(req.query.page as string) || 1; // Default to page 1
      const limit = parseInt(req.query.limit as string) || 20; // Default to 20 logs per page
      const skip = (page - 1) * limit;

      // Query to get a page of logs
      const logsQuery = FetchRunLog.find({})
        .sort({ startTime: -1 }) // Show the newest fetch runs first
        .skip(skip)
        .limit(limit)
        .lean(); // Use .lean() for performance as we're just reading data

      // Query to get the total count of logs for pagination metadata
      const totalLogsQuery = FetchRunLog.countDocuments({});

      // Execute both queries in parallel
      const [logs, totalLogs] = await Promise.all([logsQuery, totalLogsQuery]);

      res.status(200).json({
        logs: logs as IFetchRunLog[], // Cast because .lean() returns plain objects
        totalLogs,
        page,
        limit,
      });

    } catch (error: any) {
      console.error('API /api/fetch-logs GET Error:', error);
      res.status(500).json({ error: 'Failed to fetch logs from database', message: error.message });
    }
  } else {
    // Handle other HTTP methods
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}