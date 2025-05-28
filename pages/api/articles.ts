import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb'; // Your Mongoose connection utility
import Article, { IArticle } from '../../models/Article'; // Your Article Mongoose model

// Define a type for the response data.
// If you use .lean(), Mongoose returns plain JS objects, not full Mongoose documents.
// So, IArticle might need to be adjusted or you can create a specific type.
// For simplicity, we'll assume IArticle can represent the lean object shape.
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
      await dbConnect(); // Ensure DB connection

      // Fetch articles from the database
      // Sort by publishedDate descending (newest first). If publishedDate is the same or missing, sort by fetchedAt.
      // Limit to a reasonable number for the initial load, e.g., 50 or 100.
      const articles = await Article.find({}) // Find all articles
        .sort({ publishedDate: -1, fetchedAt: -1 }) // Sort: newest published, then newest fetched
        .limit(100) // Limit the number of articles returned
        .lean(); // .lean() returns plain JavaScript objects, not Mongoose documents (faster for read-only)

      if (!articles) {
        return res.status(404).json({ message: 'No articles found' });
      }

      // Mongoose .lean() returns plain objects. Ensure your IArticle type matches or cast appropriately.
      // If IArticle extends Mongoose Document, you might need a different type here.
      // For now, we assume the structure matches.
      res.status(200).json({ articles: articles as IArticle[] });

    } catch (error: any) {
      console.error('API Error fetching articles:', error);
      res.status(500).json({ error: 'Failed to fetch articles from database', message: error.message });
    }
  } else {
    // Handle any other HTTP methods
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}