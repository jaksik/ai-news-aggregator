// File: pages/api/newsletter/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import { INewsletter, NEWSLETTER_COLLECTION } from '../../../models/Newsletter';

type ResponseData = {
  newsletter?: INewsletter;
  message?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    await dbConnect();
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Newsletter ID is required' });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid newsletter ID format' });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    
    const collection = db.collection(NEWSLETTER_COLLECTION);

    switch (req.method) {
      case 'GET':
        try {
          const newsletter = await collection.findOne({ 
            _id: new mongoose.Types.ObjectId(id) 
          }) as INewsletter | null;
          
          if (!newsletter) {
            return res.status(404).json({ error: 'Newsletter not found' });
          }
          
          return res.status(200).json({ newsletter });
        } catch (error) {
          console.error('Error fetching newsletter:', error);
          return res.status(500).json({ error: 'Failed to fetch newsletter' });
        }

      case 'PUT':
        try {
          const updateData = req.body;
          
          // Validate required fields if they're being updated
          if (updateData.title && !updateData.title.trim()) {
            return res.status(400).json({ 
              error: 'Title cannot be empty' 
            });
          }

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
            return res.status(404).json({ error: 'Newsletter not found' });
          }

          return res.status(200).json({ 
            newsletter: result as INewsletter, 
            message: 'Newsletter updated successfully' 
          });
        } catch (error) {
          console.error('Error updating newsletter:', error);
          return res.status(500).json({ error: 'Failed to update newsletter' });
        }

      case 'DELETE':
        try {
          const result = await collection.deleteOne({ 
            _id: new mongoose.Types.ObjectId(id) 
          });
          
          if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Newsletter not found' });
          }
          
          return res.status(200).json({ 
            message: 'Newsletter deleted successfully' 
          });
        } catch (error) {
          console.error('Error deleting newsletter:', error);
          return res.status(500).json({ error: 'Failed to delete newsletter' });
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Method ${req.method} not allowed` 
        });
    }
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }
}
