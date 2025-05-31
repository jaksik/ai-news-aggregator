import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Article from '../../../models/Article';

type Data = {
  sources?: string[];
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      
      // Get unique source names from articles
      const sources = await Article.distinct('sourceName');
      
      // Sort sources alphabetically
      const sortedSources = sources.filter(Boolean).sort();
      
      res.status(200).json({ sources: sortedSources });
    } catch (error: unknown) {
      console.error('API /api/sources/list error:', error);
      let errorMessage = "Failed to fetch sources from database";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      res.status(500).json({ error: 'Failed to fetch sources from database', message: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
