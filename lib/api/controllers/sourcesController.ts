// File: lib/api/controllers/sourcesController.ts
// Purpose: Standardized controller for sources API operations

import dbConnect from '../../mongodb';
import Source, { ISource } from '../../../models/Source';
import { createSuccessResponse, createErrorResponse } from '../utils';
import { RequestHandler } from '../types';
import { processSingleSource, ProcessingSummary } from '../../services/fetcher';

export interface SourcesListQuery {
  type?: string;
  isEnabled?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ScrapeSourceResult extends ProcessingSummary {
  sourceId: string;
  sourceName: string;
  success: boolean;
  duration: number;
  logId?: string;
}

/**
 * List all sources with basic filtering
 */
export const listSources: RequestHandler<ISource[]> = async (req, res) => {
  await dbConnect();

  const {
    type,
    isEnabled,
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

  // Get all sources (no pagination)
  const sources = await Source.find(filter)
    .sort(sortQuery)
    .lean();

  res.status(200).json(
    createSuccessResponse(sources as ISource[], 'Sources retrieved successfully')
  );
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

/**
 * Scrape articles from a specific source
 */
export const scrapeSource: RequestHandler<ScrapeSourceResult> = async (req, res) => {
  await dbConnect();

  // Check both query and body for sourceId (support both GET and POST)
  const sourceId = req.query.sourceId || req.body.sourceId;

  if (!sourceId || typeof sourceId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Source ID is required')
    );
  }

  try {
    // Use the centralized fetcher service for single source processing
    const result = await processSingleSource(sourceId);

    if (result.success) {
      res.status(200).json(
        createSuccessResponse(result, 'Source scrape completed successfully')
      );
    } else {
      res.status(500).json(
        createSuccessResponse(result, 'Source scrape failed')
      );
    }

  } catch (error) {
    console.error(`Error scraping source ${sourceId}:`, error);
    
    const result = {
      sourceId,
      sourceName: 'Unknown',
      success: false,
      duration: 0,
      // Include empty ProcessingSummary-like fields for consistency
      sourceUrl: '',
      type: 'html' as const,
      status: 'failed' as const,
      message: error instanceof Error ? error.message : 'Unknown error',
      itemsFound: 0,
      itemsConsidered: 0,
      itemsProcessed: 0,
      newItemsAdded: 0,
      itemsSkipped: 0,
      errors: [],
      fetchError: error instanceof Error ? error.message : 'Unknown error'
    };

    res.status(500).json(
      createSuccessResponse(result, 'Source scrape failed')
    );
  }
};


