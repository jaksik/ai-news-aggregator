import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import { INewsletter, NEWSLETTER_COLLECTION } from '../../../models/Newsletter';
import mongoose from 'mongoose';
import { withHandler } from '../../../lib/api/middleware';
import { createDatabaseError, createValidationError, ValidationError } from '../../../lib/errors/errorHandler';
import { ApiResponse } from '../../../lib/api/types';

interface GetNewslettersData {
  newsletters: INewsletter[];
  total: number;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<GetNewslettersData>>
): Promise<void> {
  try {
    await dbConnect();

    // Get query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    // Validate pagination parameters
    if (page < 1) {
      throw createValidationError('Page number must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw createValidationError('Limit must be between 1 and 100');
    }

    // Build query
    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw createDatabaseError('Database connection not available');
    }

    // Get total count
    const total = await db.collection(NEWSLETTER_COLLECTION).countDocuments(query);

    // Get newsletters with pagination
    const newsletters = await db
      .collection(NEWSLETTER_COLLECTION)
      .find(query)
      .sort({ generatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray() as INewsletter[];

    res.status(200).json({
      success: true,
      data: {
        newsletters,
        total
      },
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    if (error instanceof Error && error.name.includes('ValidationError')) {
      throw error; // Re-throw validation errors
    }
    throw createDatabaseError(
      'Failed to fetch newsletters',
      { endpoint: '/api/newsletter' },
      error
    );
  }
}

export default withHandler(async (req: NextApiRequest, res: NextApiResponse<ApiResponse<GetNewslettersData>>) => {
  if (req.method !== 'GET') {
    throw new ValidationError('Method not allowed');
  }
  
  await handler(req, res);
});
