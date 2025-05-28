import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose'; // Import mongoose to validate ObjectId
import dbConnect from '../../lib/mongodb'; // Path from pages/api/
import Source, { ISource } from '../../models/Source';   // Path from pages/api/

// Define a type for the response data for this endpoint
type ResponseData = {
  source?: ISource;     // For PUT/DELETE success
  message?: string;
  error?: string;
  errors?: any;       // For Mongoose validation errors
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { sourceId } = req.query;

  if (!sourceId || Array.isArray(sourceId) || !mongoose.Types.ObjectId.isValid(sourceId as string)) {
    return res.status(400).json({ error: 'Invalid or missing source ID in the URL path.' });
  }
  const id = sourceId as string;

  try {
    await dbConnect();
  } catch (error: any) {
    console.error(`API /api/${id} - DB Connection Error:`, error);
    return res.status(500).json({ error: 'Database connection failed', message: error.message });
  }

  if (req.method === 'PUT') {
    try {
      const { name, url, type, isEnabled } = req.body;
      const updateData: Partial<Pick<ISource, 'name' | 'url' | 'type' | 'isEnabled'>> = {};

      if (name !== undefined) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (type !== undefined) {
        if (type !== 'rss' && type !== 'html') {
          return res.status(400).json({ error: 'Invalid type. Must be "rss" or "html".' });
        }
        updateData.type = type;
      }
      if (isEnabled !== undefined) updateData.isEnabled = Boolean(isEnabled);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No update data provided.' });
      }

      const updatedSource = await Source.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedSource) {
        return res.status(404).json({ error: 'Source not found.' });
      }

      return res.status(200).json({ message: 'Source updated successfully', source: updatedSource });

    } catch (error: any) {
      console.error(`API /api/${id} PUT Error:`, error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ error: 'Validation failed', message: error.message, errors: error.errors });
      }
      if (error.code === 11000) {
        return res.status(409).json({ error: 'Duplicate key error', message: 'Another source with this URL already exists.' });
      }
      return res.status(500).json({ error: 'Failed to update source', message: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Find the source by ID and delete it
      const deletedSource = await Source.findByIdAndDelete(id);

      if (!deletedSource) {
        // If no document was found with that ID
        return res.status(404).json({ error: 'Source not found with the provided ID.' });
      }

      // Successfully deleted
      return res.status(200).json({ message: 'Source deleted successfully', source: deletedSource });
      // Alternatively, for DELETE, some prefer to return a 204 No Content status if there's no body:
      // return res.status(204).end();

    } catch (error: any) {
      console.error(`API /api/${id} DELETE Error:`, error);
      return res.status(500).json({ error: 'Failed to delete source', message: error.message });
    }
  }
  else {
    // Update Allow header to include DELETE
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed on /api/${id}` });
  }
}