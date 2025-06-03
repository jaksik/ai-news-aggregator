// File: lib/api/controllers/articlesController.ts
// Purpose: Standardized controller for articles API operations

import dbConnect from '../../db';
import Article, { IArticle } from '../../../models/Article';
import { createSuccessResponse, createErrorResponse } from '../utils';
import { RequestHandler } from '../types';

export interface ArticlesListQuery {
  source?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  page?: string;
  sortBy?: string;
  sortOrder?: string;
  includeHidden?: string;
  search?: string;
}

/**
 * List articles with filtering and pagination
 */
export const listArticles: RequestHandler<IArticle[]> = async (req, res) => {
  await dbConnect();

  const {
    source,
    startDate,
    endDate,
    limit = '10',
    page = '1',
    sortBy = 'publishedDate',
    sortOrder = 'desc',
    includeHidden = 'false',
    search
  } = req.query as ArticlesListQuery;

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
      endDateObj.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDateObj;
    }
    filter.publishedDate = dateFilter;
  }

  // Hidden articles filter
  if (includeHidden === 'false') {
    filter.isHidden = { $ne: true };
  }

  // Text search filter
  if (search && typeof search === 'string' && search.trim()) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
      { sourceName: { $regex: search.trim(), $options: 'i' } }
    ];
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

  // Parse pagination
  const limitNum = Math.max(1, parseInt(limit as string) || 10);
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [articles, total] = await Promise.all([
    Article.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Article.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  const response = createSuccessResponse(
    articles as IArticle[],
    'Articles retrieved successfully',
    {
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        source,
        startDate,
        endDate,
        includeHidden: includeHidden === 'true',
        search
      }
    }
  );

  res.status(200).json(response);
};

/**
 * Get a specific article by ID
 */
export const getArticle: RequestHandler<IArticle> = async (req, res) => {
  await dbConnect();

  const { articleId } = req.query;

  if (!articleId || typeof articleId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Article ID is required')
    );
  }

  const article = await Article.findById(articleId).lean();

  if (!article) {
    return res.status(404).json(
      createErrorResponse('Article not found')
    );
  }

  res.status(200).json(
    createSuccessResponse(article as IArticle, 'Article retrieved successfully')
  );
};

/**
 * Update an article (typically for hiding/showing)
 */
export const updateArticle: RequestHandler<IArticle> = async (req, res) => {
  await dbConnect();

  const { articleId } = req.query;
  const updates = req.body;

  if (!articleId || typeof articleId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Article ID is required')
    );
  }

  // Only allow specific fields to be updated
  const allowedUpdates = ['isHidden', 'title', 'description'];
  const filteredUpdates: Record<string, unknown> = {};

  for (const key of allowedUpdates) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return res.status(400).json(
      createErrorResponse('No valid fields provided for update', {
        allowedFields: allowedUpdates
      })
    );
  }

  const article = await Article.findByIdAndUpdate(
    articleId,
    { 
      ...filteredUpdates,
      updatedAt: new Date()
    },
    { new: true, lean: true }
  );

  if (!article) {
    return res.status(404).json(
      createErrorResponse('Article not found')
    );
  }

  res.status(200).json(
    createSuccessResponse(article as IArticle, 'Article updated successfully')
  );
};

/**
 * Delete an article
 */
export const deleteArticle: RequestHandler<{ success: boolean }> = async (req, res) => {
  await dbConnect();

  const { articleId } = req.query;

  if (!articleId || typeof articleId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Article ID is required')
    );
  }

  const result = await Article.findByIdAndDelete(articleId);

  if (!result) {
    return res.status(404).json(
      createErrorResponse('Article not found')
    );
  }

  res.status(200).json(
    createSuccessResponse({ success: true }, 'Article deleted successfully')
  );
};

/**
 * Get unique source names from articles for filtering
 * This provides the list of sources that actually have articles for the ArticleFilters component
 */
export const getSourceNames: RequestHandler<{ sources: string[] }> = async (req, res) => {
  await dbConnect();

  try {
    // Get unique source names from articles (sources that actually have content)
    const sources = await Article.distinct('sourceName');
    
    // Sort sources alphabetically and filter out any null/empty values
    const sortedSources = sources.filter(Boolean).sort();

    res.status(200).json(
      createSuccessResponse(
        { sources: sortedSources },
        'Source names retrieved successfully',
        {
          timestamp: new Date().toISOString()
        }
      )
    );
  } catch (error) {
    console.error('Error fetching source names:', error);
    res.status(500).json(
      createErrorResponse('Failed to fetch source names from database')
    );
  }
};
