import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb'; // Adjust path: up three levels
import Article, { IArticle } from '../../../models/Article';   // Adjust path: up three levels

type ResponseData = {
  article?: IArticle;
  message?: string;
  error?: string;
  errors?: Record<string, unknown>; // For potential validation errors from Mongoose
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { articleId } = req.query; // Get articleId from the URL path

  // 1. Validate articleId
  if (!articleId || Array.isArray(articleId) || !mongoose.Types.ObjectId.isValid(articleId as string)) {
    return res.status(400).json({ error: 'Invalid or missing article ID.' });
  }
  const id = articleId as string;

  // 2. Ensure Database Connection
  try {
    await dbConnect();
  } catch (error: unknown) {
    console.error(`API /api/articles/${id} - DB Connection Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database connection error';
    return res.status(500).json({ error: 'Database connection failed', message: errorMessage });
  }

  // 3. Handle PUT Request to update the article (specifically isHidden)
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
        { isHidden: isHidden }, // The update object
        { new: true, runValidators: true } // Options: return the updated doc, run schema validators
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
  } else {
    // Handle other methods if you expand this file later (e.g., GET for single article, DELETE for single article)
    res.setHeader('Allow', ['PUT']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed on /api/articles/${id}` });
  }
}