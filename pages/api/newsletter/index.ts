import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import { INewsletter, NEWSLETTER_COLLECTION } from '../../../models/Newsletter';
import mongoose from 'mongoose';

interface GetNewslettersResponse {
  newsletters?: INewsletter[];
  total?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetNewslettersResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Get query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    // Build query
    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
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
      newsletters,
      total
    });

  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch newsletters' 
    });
  }
}
