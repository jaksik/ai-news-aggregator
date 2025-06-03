// File: pages/api/tools/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../lib/db';
import Tool, { ITool, IToolDocument } from '../../../models/Tool';
import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';
import { 
  createValidationError,
  createNotFoundError,
  createDatabaseError
} from '../../../lib/errors/errorHandler';
import { ApiResponse } from '../../../lib/api/types';

// Helper function to convert Mongoose document to plain object
function toPlainObject(doc: IToolDocument): ITool {
  return {
    _id: (doc._id as mongoose.Types.ObjectId).toString(),
    name: doc.name,
    category: doc.category,
    subcategory: doc.subcategory,
    url: doc.url,
    logoUrl: doc.logoUrl,
    description: doc.description,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

type ToolData = {
  tool: ITool;
  message?: string;
};

export default createMethodHandler({
  GET: getTool,
  PUT: updateTool,
  DELETE: deleteTool
});

// GET tool by ID
async function getTool(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ToolData>>
): Promise<void> {
  await dbConnect();
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    throw createValidationError('Tool ID is required');
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createValidationError('Invalid tool ID format');
  }

  try {
    const tool = await Tool.findById(id);
    
    if (!tool) {
      throw createNotFoundError('Tool');
    }
    
    res.status(200).json({
      success: true,
      data: { tool: toPlainObject(tool) },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw createDatabaseError('Failed to fetch tool', {}, error);
  }
}

// PUT update tool
async function updateTool(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ToolData>>
): Promise<void> {
  await dbConnect();
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    throw createValidationError('Tool ID is required');
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createValidationError('Invalid tool ID format');
  }

  const { name, description, url, category, logoUrl } = req.body;
  
  if (!name || !description || !url) {
    throw createValidationError('Name, description, and URL are required');
  }

  try {
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
      throw createNotFoundError('Tool');
    }

    res.status(200).json({
      success: true,
      data: { 
        tool: toPlainObject(updatedTool), 
        message: 'Tool updated successfully' 
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw createDatabaseError('Failed to update tool', {}, error);
  }
}

// DELETE tool
async function deleteTool(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ message: string }>>
): Promise<void> {
  await dbConnect();
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    throw createValidationError('Tool ID is required');
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createValidationError('Invalid tool ID format');
  }

  try {
    const deletedTool = await Tool.findByIdAndDelete(id);
    
    if (!deletedTool) {
      throw createNotFoundError('Tool');
    }
    
    res.status(200).json({
      success: true,
      data: { 
        message: 'Tool deleted successfully' 
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw createDatabaseError('Failed to delete tool', {}, error);
  }
}
