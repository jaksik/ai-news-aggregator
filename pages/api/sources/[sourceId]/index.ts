// File: pages/api/sources/[sourceId]/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Source, { ISource } from '../../../../models/Source';

interface MongooseValidationError {
    [key: string]: {
        message: string;
        name: string;
        properties: {
            message: string;
            type: string;
            path: string;
            value?: unknown;
        };
        kind: string;
        path: string;
        value?: unknown;
    };
}

type ResponseData = {
  source?: ISource;
  message?: string;
  error?: string;
  errors?: MongooseValidationError | Record<string, unknown>;
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
  } catch (error: unknown) {
    console.error(`API /api/sources/${id} - DB Connection Error:`, error);
    let message = 'Database connection failed';
    if (error instanceof Error) {
        message = error.message;
    }
    return res.status(500).json({ error: 'Database connection failed', message });
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

    } catch (error: unknown) {
      console.error(`API /api/sources/${id} PUT Error:`, error);
      if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({ error: 'Validation failed', message: error.message, errors: error.errors });
      }
      // For MongoDB duplicate key error (code 11000)
      if (typeof error === 'object' && error !== null && 'code' in error && (error as {code: unknown}).code === 11000) {
        return res.status(409).json({ error: 'Duplicate key error', message: 'Another source with this URL already exists.' });
      }
      let message = 'Failed to update source';
      if (error instanceof Error) {
        message = error.message;
      }
      return res.status(500).json({ error: 'Failed to update source', message });
    }

  } else if (req.method === 'DELETE') {
    try {
      const deletedSource = await Source.findByIdAndDelete(id);

      if (!deletedSource) {
        return res.status(404).json({ error: 'Source not found with the provided ID.' });
      }

      return res.status(200).json({ message: 'Source deleted successfully', source: deletedSource });

    } catch (error: unknown) {
      console.error(`API /api/sources/${id} DELETE Error:`, error);
      let message = 'Failed to delete source';
      if (error instanceof Error) {
        message = error.message;
      }
      return res.status(500).json({ error: 'Failed to delete source', message });
    }

  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed on /api/sources/${id}` });
  }
}
