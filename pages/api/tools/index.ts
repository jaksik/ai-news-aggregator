import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Tool from '../../../models/Tool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
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

    const tools = await Tool.find(filter)
      .sort({ category: 1, subcategory: 1, name: 1 })
      .lean();

    return res.status(200).json({ 
      tools,
      count: tools.length 
    });
  } catch (error: unknown) {
    console.error('Error fetching tools:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: `Failed to fetch tools: ${message}` });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, category, subcategory, url, logoUrl, description } = req.body;

    // Validate required fields
    if (!name || !category || !subcategory || !url || !logoUrl || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, category, subcategory, url, logoUrl, description' 
      });
    }

    // Check if tool with same name already exists
    const existingTool = await Tool.findOne({ name: name.trim() });
    if (existingTool) {
      return res.status(409).json({ 
        error: 'A tool with this name already exists' 
      });
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

    return res.status(201).json({ 
      message: 'Tool created successfully',
      tool: newTool
    });
  } catch (error: unknown) {
    console.error('Error creating tool:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: error.message
      });
    }

    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: `Failed to create tool: ${message}` });
  }
}
