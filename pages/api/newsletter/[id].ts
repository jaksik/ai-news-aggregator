// File: pages/api/newsletter/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import { INewsletter, NEWSLETTER_COLLECTION } from '../../../models/Newsletter';
import { createMethodHandler } from '../../../lib/api/handlers';
import { 
  createValidationError, 
  createNotFoundError, 
  createDatabaseError 
} from '../../../lib/errors/errorHandler';
import { ApiResponse } from '../../../lib/api/types';

type NewsletterData = {
  newsletter: INewsletter;
};

type DeleteResponse = {
  message: string;
};

// GET newsletter by ID
async function getNewsletter(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<NewsletterData>>
): Promise<void> {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    throw createValidationError('Newsletter ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createValidationError('Invalid newsletter ID format');
  }

  try {
    await dbConnect();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw createDatabaseError('Database connection not established');
    }
    
    const collection = db.collection(NEWSLETTER_COLLECTION);
    const newsletter = await collection.findOne({ 
      _id: new mongoose.Types.ObjectId(id) 
    }) as INewsletter | null;
    
    if (!newsletter) {
      throw createNotFoundError('Newsletter');
    }
    
    res.status(200).json({
      success: true,
      data: { newsletter },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw createDatabaseError(
      'Failed to fetch newsletter',
      { additionalData: { newsletterId: id } },
      error
    );
  }
}

// PUT update newsletter
async function updateNewsletter(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<NewsletterData>>
): Promise<void> {
  const { id } = req.query;
  const updateData = req.body;
  
  if (!id || typeof id !== 'string') {
    throw createValidationError('Newsletter ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createValidationError('Invalid newsletter ID format');
  }

  // Validate required fields if they're being updated
  if (updateData.title && !updateData.title.trim()) {
    throw createValidationError('Title cannot be empty');
  }

  try {
    await dbConnect();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw createDatabaseError('Database connection not established');
    }
    
    const collection = db.collection(NEWSLETTER_COLLECTION);
    const result = await collection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { 
        $set: { 
          ...updateData, 
          lastModified: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw createNotFoundError('Newsletter');
    }

    res.status(200).json({
      success: true,
      data: { newsletter: result as INewsletter },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw createDatabaseError(
      'Failed to update newsletter',
      { additionalData: { newsletterId: id } },
      error
    );
  }
}

// DELETE newsletter
async function deleteNewsletter(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<DeleteResponse>>
): Promise<void> {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    throw createValidationError('Newsletter ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createValidationError('Invalid newsletter ID format');
  }

  try {
    await dbConnect();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw createDatabaseError('Database connection not established');
    }
    
    const collection = db.collection(NEWSLETTER_COLLECTION);
    const result = await collection.deleteOne({ 
      _id: new mongoose.Types.ObjectId(id) 
    });
    
    if (result.deletedCount === 0) {
      throw createNotFoundError('Newsletter');
    }
    
    res.status(200).json({
      success: true,
      data: { message: 'Newsletter deleted successfully' },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw createDatabaseError(
      'Failed to delete newsletter',
      { additionalData: { newsletterId: id } },
      error
    );
  }
}

export default createMethodHandler<NewsletterData | DeleteResponse>({
  GET: getNewsletter,
  PUT: updateNewsletter,
  DELETE: deleteNewsletter
});
