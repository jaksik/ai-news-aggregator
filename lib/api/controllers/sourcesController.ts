// File: lib/api/controllers/sourcesController.ts
// Purpose: Standardized controller for sources API operations

import dbConnect from '../../mongodb';
import Source, { ISource } from '../../../models/Source';
import { createSuccessResponse, createErrorResponse } from '../utils';
import { RequestHandler } from '../types';
import { fetchParseAndStoreSource, SourceToFetch } from '../../services/fetcher';

export interface SourcesListQuery {
  type?: string;
  isEnabled?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * List all sources with filtering and pagination
 */
export const listSources: RequestHandler<ISource[]> = async (req, res) => {
  await dbConnect();

  const {
    type,
    isEnabled,
    page = '1',
    limit = '10',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query as SourcesListQuery;

  // Build filter query
  const filter: Record<string, unknown> = {};

  if (type && typeof type === 'string') {
    filter.type = type;
  }

  if (isEnabled && typeof isEnabled === 'string') {
    filter.isEnabled = isEnabled === 'true';
  }

  // Build sort query
  const sortQuery: { [key: string]: 1 | -1 } = {};
  const validSortFields = ['createdAt', 'updatedAt', 'name', 'type'];
  const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  sortQuery[sortField as string] = sortDirection;

  // Parse pagination
  const limitNum = Math.max(1, parseInt(limit as string) || 10);
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [sources, total] = await Promise.all([
    Source.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Source.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  const response = createSuccessResponse(
    sources as ISource[],
    'Sources retrieved successfully',
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
        type,
        isEnabled: isEnabled ? isEnabled === 'true' : undefined
      }
    }
  );

  res.status(200).json(response);
};

/**
 * Create a new source
 */
export const createSource: RequestHandler<ISource> = async (req, res) => {
  await dbConnect();

  const { name, url, type, isEnabled = true, scrapingConfig } = req.body;

  // Validation
  if (!name || !url || !type) {
    return res.status(400).json(
      createErrorResponse('Missing required fields: name, url, type')
    );
  }

  if (!['rss', 'html'].includes(type)) {
    return res.status(400).json(
      createErrorResponse('Invalid type. Must be "rss" or "html"')
    );
  }

  // Check for duplicate URL
  const existingSource = await Source.findOne({ url });
  if (existingSource) {
    return res.status(409).json(
      createErrorResponse('A source with this URL already exists')
    );
  }

  try {
    const source = new Source({
      name: name.trim(),
      url: url.trim(),
      type,
      isEnabled,
      scrapingConfig: scrapingConfig || {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedSource = await source.save();

    res.status(201).json(
      createSuccessResponse(savedSource.toObject() as ISource, 'Source created successfully')
    );
  } catch (error) {
    console.error('Error creating source:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json(
        createErrorResponse('Validation error', { details: error.message })
      );
    }

    throw error;
  }
};

/**
 * Get a specific source by ID
 */
export const getSource: RequestHandler<ISource> = async (req, res) => {
  await dbConnect();

  const { sourceId } = req.query;

  if (!sourceId || typeof sourceId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Source ID is required')
    );
  }

  const source = await Source.findById(sourceId).lean();

  if (!source) {
    return res.status(404).json(
      createErrorResponse('Source not found')
    );
  }

  res.status(200).json(
    createSuccessResponse(source as ISource, 'Source retrieved successfully')
  );
};

/**
 * Update a source
 */
export const updateSource: RequestHandler<ISource> = async (req, res) => {
  await dbConnect();

  const { sourceId } = req.query;
  const updates = req.body;

  if (!sourceId || typeof sourceId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Source ID is required')
    );
  }

  // Only allow specific fields to be updated
  const allowedUpdates = ['name', 'url', 'type', 'isEnabled', 'scrapingConfig'];
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

  // Check for URL conflicts if URL is being updated
  if (filteredUpdates.url) {
    const existingSource = await Source.findOne({ 
      url: filteredUpdates.url,
      _id: { $ne: sourceId }
    });
    
    if (existingSource) {
      return res.status(409).json(
        createErrorResponse('A source with this URL already exists')
      );
    }
  }

  try {
    const source = await Source.findByIdAndUpdate(
      sourceId,
      { 
        ...filteredUpdates,
        updatedAt: new Date()
      },
      { new: true, lean: true, runValidators: true }
    );

    if (!source) {
      return res.status(404).json(
        createErrorResponse('Source not found')
      );
    }

    res.status(200).json(
      createSuccessResponse(source as ISource, 'Source updated successfully')
    );
  } catch (error) {
    console.error('Error updating source:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json(
        createErrorResponse('Validation error', { details: error.message })
      );
    }

    throw error;
  }
};

/**
 * Delete a source
 */
export const deleteSource: RequestHandler<{ success: boolean }> = async (req, res) => {
  await dbConnect();

  const { sourceId } = req.query;

  if (!sourceId || typeof sourceId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Source ID is required')
    );
  }

  const result = await Source.findByIdAndDelete(sourceId);

  if (!result) {
    return res.status(404).json(
      createErrorResponse('Source not found')
    );
  }

  res.status(200).json(
    createSuccessResponse({ success: true }, 'Source deleted successfully')
  );
};

export interface ScrapeResult {
  sourceId: string;
  sourceName: string;
  success: boolean;
  articlesProcessed?: number;
  error?: string;
  duration?: number;
}

export interface BatchScrapeResult {
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  results: ScrapeResult[];
  totalArticlesProcessed: number;
  duration: number;
}

/**
 * Scrape articles from all enabled sources
 */
export const scrapeAllSources: RequestHandler<BatchScrapeResult> = async (req, res) => {
  await dbConnect();

  const startTime = Date.now();
  const results: ScrapeResult[] = [];
  let totalArticlesProcessed = 0;

  try {
    // Get all enabled sources
    const sources = await Source.find({ isEnabled: true }).lean();

    if (sources.length === 0) {
      return res.status(200).json(
        createSuccessResponse({
          totalSources: 0,
          successfulSources: 0,
          failedSources: 0,
          results: [],
          totalArticlesProcessed: 0,
          duration: Date.now() - startTime
        }, 'No enabled sources found')
      );
    }

    // Process each source
    for (const source of sources) {
      const sourceStartTime = Date.now();
      let result: ScrapeResult = {
        sourceId: source._id.toString(),
        sourceName: source.name,
        success: false
      };

      try {
        let articlesProcessed = 0;

        // Create SourceToFetch object
        const sourceToFetch: SourceToFetch = {
          name: source.name,
          url: source.url,
          type: source.type,
          scrapingConfig: source.scrapingConfig,
        };

        // Use the centralized fetcher function
        const fetchResult = await fetchParseAndStoreSource(sourceToFetch);
        articlesProcessed = fetchResult.newItemsAdded;

        result = {
          ...result,
          success: true,
          articlesProcessed,
          duration: Date.now() - sourceStartTime
        };

        totalArticlesProcessed += articlesProcessed;
      } catch (error) {
        console.error(`Error processing source ${source.name}:`, error);
        result = {
          ...result,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - sourceStartTime
        };
      }

      results.push(result);
    }

    const successfulSources = results.filter(r => r.success).length;
    const failedSources = results.filter(r => !r.success).length;

    const batchResult: BatchScrapeResult = {
      totalSources: sources.length,
      successfulSources,
      failedSources,
      results,
      totalArticlesProcessed,
      duration: Date.now() - startTime
    };

    res.status(200).json(
      createSuccessResponse(batchResult, 'Batch scrape completed')
    );

  } catch (error) {
    console.error('Error in batch scrape:', error);
    throw error;
  }
};

/**
 * Scrape articles from a specific source
 */
export const scrapeSource: RequestHandler<ScrapeResult> = async (req, res) => {
  await dbConnect();

  // Check both query and body for sourceId (support both GET and POST)
  const sourceId = req.query.sourceId || req.body.sourceId;

  if (!sourceId || typeof sourceId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Source ID is required')
    );
  }

  const startTime = Date.now();

  try {
    // Get the source
    const source = await Source.findById(sourceId).lean();

    if (!source) {
      return res.status(404).json(
        createErrorResponse('Source not found')
      );
    }

    if (!source.isEnabled) {
      return res.status(400).json(
        createErrorResponse('Source is disabled')
      );
    }

    // Create SourceToFetch object
    const sourceToFetch: SourceToFetch = {
      name: source.name,
      url: source.url,
      type: source.type,
      scrapingConfig: source.scrapingConfig,
    };

    // Use the centralized fetcher function
    const fetchResult = await fetchParseAndStoreSource(sourceToFetch);
    const articlesProcessed = fetchResult.newItemsAdded;

    const result: ScrapeResult = {
      sourceId,
      sourceName: source.name,
      success: true,
      articlesProcessed,
      duration: Date.now() - startTime
    };

    res.status(200).json(
      createSuccessResponse(result, 'Source scrape completed successfully')
    );

  } catch (error) {
    console.error(`Error scraping source ${sourceId}:`, error);
    
    const result: ScrapeResult = {
      sourceId,
      sourceName: 'Unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };

    res.status(500).json(
      createSuccessResponse(result, 'Source scrape failed')
    );
  }
};


