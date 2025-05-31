// File: pages/api/tools/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Tool, { ITool } from '../../../models/Tool';

type ResponseData = {
  tool?: ITool;
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
      return res.status(400).json({ error: 'Tool ID is required' });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid tool ID format' });
    }

    switch (req.method) {
      case 'GET':
        try {
          const tool = await Tool.findById(id);
          
          if (!tool) {
            return res.status(404).json({ error: 'Tool not found' });
          }
          
          return res.status(200).json({ tool });
        } catch (error) {
          console.error('Error fetching tool:', error);
          return res.status(500).json({ error: 'Failed to fetch tool' });
        }

      case 'PUT':
        try {
          const { name, description, url, category, logoUrl } = req.body;
          
          if (!name || !description || !url) {
            return res.status(400).json({ 
              error: 'Name, description, and URL are required' 
            });
          }

          const updatedTool = await Tool.findByIdAndUpdate(
            id,
            {
              name: name.trim(),
              description: description.trim(),
              url: url.trim(),
              category: category?.trim() || 'Other',
              logoUrl: logoUrl?.trim() || '',
              updatedAt: new Date()
            },
            { new: true, runValidators: true }
          );

          if (!updatedTool) {
            return res.status(404).json({ error: 'Tool not found' });
          }

          return res.status(200).json({ 
            tool: updatedTool, 
            message: 'Tool updated successfully' 
          });
        } catch (error) {
          console.error('Error updating tool:', error);
          return res.status(500).json({ error: 'Failed to update tool' });
        }

      case 'DELETE':
        try {
          const deletedTool = await Tool.findByIdAndDelete(id);
          
          if (!deletedTool) {
            return res.status(404).json({ error: 'Tool not found' });
          }
          
          return res.status(200).json({ 
            message: 'Tool deleted successfully' 
          });
        } catch (error) {
          console.error('Error deleting tool:', error);
          return res.status(500).json({ error: 'Failed to delete tool' });
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
