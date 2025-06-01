// File: pages/api/articles/index.ts
// Purpose: Serves as the main API for retrieving articles with powerful filtering capabilities. Used by:

// Frontend article lists: Display filtered and sorted articles
// Search functionality: Filter by source, date range, visibility
// Admin interface: Review all articles with various filters
// Analytics: Get article counts and data for reporting
// Query Parameters: source, startDate, endDate, limit, sortBy, sortOrder, includeHidden

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Article, { IArticle } from '../../../models/Article';

type Data = {
  articles?: IArticle[];
  total?: number;
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
      
      // Extract query parameters
      const {
        source,
        startDate,
        endDate,
        limit = '100',
        sortBy = 'publishedDate',
        sortOrder = 'desc',
        includeHidden = 'false'
      } = req.query;

      // Build filter query
      const filter: Record<string, unknown> = {};

      // Source filter
      if (source && typeof source === 'string' && source.trim()) {
        filter.sourceName = source;
      }

      // Date range filter
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate && typeof startDate === 'string') {
          dateFilter.$gte = new Date(startDate);
        }
        if (endDate && typeof endDate === 'string') {
          const endDateObj = new Date(endDate);
          // Include the entire end date by setting time to end of day
          endDateObj.setHours(23, 59, 59, 999);
          dateFilter.$lte = endDateObj;
        }
        filter.publishedDate = dateFilter;
      }

      // Hidden articles filter
      if (includeHidden === 'false') {
        filter.isHidden = { $ne: true };
      }

      // Build sort query
      const sortQuery: { [key: string]: 1 | -1 } = {};
      const validSortFields = ['publishedDate', 'title', 'sourceName', 'fetchedAt'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'publishedDate';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      
      sortQuery[sortField as string] = sortDirection;
      
      // Add secondary sort by fetchedAt if not already sorting by it
      if (sortField !== 'fetchedAt') {
        sortQuery.fetchedAt = -1;
      }

      // Parse limit
      const limitNum = parseInt(limit as string);
      const finalLimit = isNaN(limitNum) || limitNum <= 0 ? 0 : limitNum;

      // Execute query
      let query = Article.find(filter).sort(sortQuery);
      
      if (finalLimit > 0) {
        query = query.limit(finalLimit);
      }

      const articles = await query.lean();
      
      // Get total count for reference (useful for pagination later)
      const total = await Article.countDocuments(filter);

      res.status(200).json({ 
        articles: articles as IArticle[], 
        total 
      });
    } catch (error: unknown) {
      console.error('API /api/articles error:', error);
      let errorMessage = "Failed to fetch articles from database";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      res.status(500).json({ error: 'Failed to fetch articles from database', message: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
