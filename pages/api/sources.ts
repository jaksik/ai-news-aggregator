import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb'; // Your Mongoose connection utility
import Source, { ISource } from '../../models/Source'; // Your Source Mongoose model

// Updated ResponseData to potentially include a single source (for POST) or validation errors
type ResponseData = {
  sources?: ISource[];  // For GET list
  source?: ISource;     // For POST success (the created source)
  message?: string;
  error?: string;
  errors?: any;       // For Mongoose validation errors
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    await dbConnect(); // Ensure DB connection for all methods
  } catch (error: any) {
    console.error('API /api/sources - DB Connection Error:', error);
    return res.status(500).json({ error: 'Database connection failed', message: error.message });
  }

  if (req.method === 'GET') {
    try {
      const sources = await Source.find({})
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ sources: sources as ISource[] });
    } catch (error: any) {
      console.error('API /api/sources GET Error:', error);
      return res.status(500).json({ error: 'Failed to fetch sources', message: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, url, type, isEnabled } = req.body;

      // Basic server-side validation
      if (!name || !url || !type) {
        return res.status(400).json({ error: 'Missing required fields: name, url, and type are required.' });
      }
      if (type !== 'rss' && type !== 'html') {
        return res.status(400).json({ error: 'Invalid type. Must be "rss" or "html".' });
      }

      // Create a new source document
      // Mongoose will apply schema validations (e.g., unique URL, required fields)
      const newSource = new Source({
        name,
        url,
        type,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true, // Default to true if not provided
      });

      const savedSource = await newSource.save(); // This will throw an error if validation fails

      return res.status(201).json({ message: 'Source created successfully', source: savedSource });

    } catch (error: any) {
      console.error('API /api/sources POST Error:', error);
      if (error.name === 'ValidationError') {
        // Handle Mongoose validation errors (e.g., required field missing as per schema)
        return res.status(400).json({ error: 'Validation failed', message: error.message, errors: error.errors });
      }
      if (error.code === 11000) {
        // Handle duplicate key error from MongoDB (e.g., if 'url' is not unique)
        return res.status(409).json({ error: 'Duplicate data', message: 'A source with this URL already exists.' });
      }
      // For other errors
      return res.status(500).json({ error: 'Failed to create source', message: error.message });
    }
  } else {
    // Update Allow header for other methods
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}