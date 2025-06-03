import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/db';
import Tool, { ITool, IToolDocument } from '../../../models/Tool';
import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';
import { 
  createValidationError,
  createNotFoundError,
  createDatabaseError,
  ConflictError
} from '../../../lib/errors/errorHandler';
import { ApiResponse } from '../../../lib/api/types';

interface ToolCreateResponse {
  tool: ITool;
  message: string;
}

interface ToolDeleteResponse {
  message: string;
}

interface ToolUpdateResponse {
  tool: ITool | null;
  message: string;
}

// Helper function to convert Mongoose document to plain object
function toPlainObject(doc: IToolDocument): ITool {
  const obj = doc.toObject();
  return {
    _id: obj._id.toString(),
    name: obj.name,
    category: obj.category,
    subcategory: obj.subcategory,
    url: obj.url,
    logoUrl: obj.logoUrl,
    description: obj.description,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

// Response interfaces
interface ToolResponse {
  tools: ITool[];
  total: number;
}

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
  PUT: handlePut,
  DELETE: handleDelete
});

async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponse<ToolResponse>>): Promise<void> {
  await dbConnect();
  
  const { category, subcategory, search } = req.query;
  
  // Build filter object
  const filter: Record<string, unknown> = {};
  if (category && typeof category === 'string') {
    filter.category = category;
  }
  if (subcategory && typeof subcategory === 'string') {
    filter.subcategory = subcategory;
  }
  if (search && typeof search === 'string') {
    filter.$text = { $search: search };
  }

  try {
    const toolsDocs = await Tool.find(filter)
      .sort({ category: 1, subcategory: 1, name: 1 })
      .lean(); // Using lean() already returns plain objects, but _id needs conversion
    
    const tools: ITool[] = toolsDocs.map(doc => ({
      ...doc,
      _id: doc._id.toString(), // Ensure _id is a string
    }));

    res.status(200).json({ 
      success: true,
      data: {
        tools,
        total: tools.length 
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw createDatabaseError('Failed to fetch tools', {}, error);
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse<ApiResponse<ToolCreateResponse>>): Promise<void> {
  await dbConnect();
  
  const { name, category, subcategory, url, logoUrl, description } = req.body;

  // Validate required fields
  if (!name || !category || !subcategory || !url || !logoUrl || !description) {
    throw createValidationError('Missing required fields: name, category, subcategory, url, logoUrl, description');
  }

  try {
    // Check if tool with same name already exists
    const existingTool = await Tool.findOne({ name: name.trim() });
    if (existingTool) {
      throw new ConflictError('A tool with this name already exists');
    }

    // Create new tool
    const newTool = new Tool({
      name: name.trim(),
      category: category.trim(),
      subcategory: subcategory.trim(),
      url: url.trim(),
      logoUrl: logoUrl.trim(),
      description: description.trim(),
    });

    await newTool.save();

    res.status(201).json({ 
      success: true,
      data: {
        message: 'Tool created successfully',
        tool: toPlainObject(newTool)
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error; // Re-throw ConflictError to preserve type
    }
    throw createDatabaseError('Failed to create tool', {}, error);
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse<ApiResponse<ToolUpdateResponse>>): Promise<void> {
  await dbConnect();
  
  const { id, name, category, subcategory, url, logoUrl, description } = req.body;

  if (!id) {
    throw createValidationError('Tool ID is required');
  }

  // Validate required fields
  if (!name || !category || !subcategory || !url || !logoUrl || !description) {
    throw createValidationError('All fields are required');
  }

  try {
    // Check if tool exists
    const existingTool = await Tool.findById(id);
    if (!existingTool) {
      throw createNotFoundError('Tool');
    }

    // Update the tool
    const updatedTool = await Tool.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        category: category.trim(),
        subcategory: subcategory.trim(),
        url: url.trim(),
        logoUrl: logoUrl.trim(),
        description: description.trim(),
      },
      { 
        new: true, // Return the updated document
        runValidators: true // Run mongoose validations
      }
    );

    res.status(200).json({ 
      success: true,
      data: {
        message: 'Tool updated successfully',
        tool: updatedTool ? toPlainObject(updatedTool) : null // Handle null case
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw createDatabaseError('Failed to update tool', {}, error);
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse<ApiResponse<ToolDeleteResponse>>): Promise<void> {
  await dbConnect();
  
  const { id } = req.body;

  if (!id) {
    throw createValidationError('Tool ID is required');
  }

  try {
    // Check if tool exists
    const existingTool = await Tool.findById(id);
    if (!existingTool) {
      throw createNotFoundError('Tool');
    }

    // Delete the tool
    await Tool.findByIdAndDelete(id);

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
