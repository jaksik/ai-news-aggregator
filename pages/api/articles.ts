// File: pages/api/articles.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Article, { IArticle } from '../../models/Article';

type Data = {
  articles?: IArticle[];
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
      const articles = await Article.find({})
        .sort({ publishedDate: -1, fetchedAt: -1 })
        .limit(100)
        .lean();
      res.status(200).json({ articles: articles as IArticle[] });
    } catch (error: unknown) { // Changed 'any' to 'unknown'
      console.error('API /api/articles error:', error);
      let errorMessage = "Failed to fetch articles from database";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      // You could log the 'error' object itself if it's not an Error instance for more details
      res.status(500).json({ error: 'Failed to fetch articles from database', message: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}