// File: pages/api/articles/[articleId]/index.ts
// Purpose: Provides CRUD operations for individual articles, allowing the frontend interface to:
// Hide/show articles: Toggle article visibility without deletion
// Delete articles: Remove unwanted or inappropriate content
// Content moderation: Manage article visibility for users
// Flow: Frontend Request → Validate Article ID → Update/Delete Article → Return Results

// Use Cases:
// Content moderation (hiding inappropriate articles)
// Admin article management
// User-driven content filtering

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Article, { IArticle } from '../../../../models/Article';

type ResponseData = {
  article?: IArticle;
  message?: string;
  error?: string;
  errors?: Record<string, unknown>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { articleId } = req.query;

  // Validate articleId
  if (!articleId || Array.isArray(articleId) || !mongoose.Types.ObjectId.isValid(articleId as string)) {
    return res.status(400).json({ error: 'Invalid or missing article ID.' });
  }
  const id = articleId as string;

  // Ensure Database Connection
  try {
    await dbConnect();
  } catch (error: unknown) {
    console.error(`API /api/articles/${id} - DB Connection Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database connection error';
    return res.status(500).json({ error: 'Database connection failed', message: errorMessage });
  }

  // Handle PUT Request to update the article
  if (req.method === 'PUT') {
    try {
      const { isHidden } = req.body;

      // Validate the isHidden field from the request body
      if (typeof isHidden !== 'boolean') {
        return res.status(400).json({ error: 'Invalid request body: "isHidden" must be a boolean value (true or false).' });
      }

      // Find the article by ID and update only the isHidden field
      const updatedArticle = await Article.findByIdAndUpdate(
        id,
        { isHidden: isHidden },
        { new: true, runValidators: true }
      );

      if (!updatedArticle) {
        return res.status(404).json({ error: 'Article not found with the provided ID.' });
      }

      return res.status(200).json({ message: 'Article visibility updated successfully', article: updatedArticle });

    } catch (error: unknown) {
      console.error(`API /api/articles/${id} PUT Error:`, error);
      let errorMessage = 'Failed to update article visibility';
      let validationErrors;

      if (error instanceof mongoose.Error.ValidationError) {
        errorMessage = 'Validation failed for article update.';
        validationErrors = error.errors;
        return res.status(400).json({ error: errorMessage, message: error.message, errors: validationErrors });
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return res.status(500).json({ error: 'Failed to update article visibility', message: errorMessage });
    }

  // Handle DELETE Request to delete the article
  } else if (req.method === 'DELETE') {
    try {
      const deletedArticle = await Article.findByIdAndDelete(id);

      if (!deletedArticle) {
        return res.status(404).json({ error: 'Article not found with the provided ID.' });
      }

      return res.status(200).json({ message: 'Article deleted successfully', article: deletedArticle });

    } catch (error: unknown) {
      console.error(`API /api/articles/${id} DELETE Error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete article';
      return res.status(500).json({ error: 'Failed to delete article', message: errorMessage });
    }

  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed on /api/articles/${id}` });
  }
}
