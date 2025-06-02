// File: pages/api/articles/external/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/mongodb';
import Article, { IArticle } from '../../../../models/Article';
import { withHandler } from '../../../../lib/api/middleware';
import { 
  createValidationError, 
  ConflictError, 
  createDatabaseError 
} from '../../../../lib/errors/errorHandler';
import { ApiResponse } from '../../../../lib/api/types';

type ArticleData = {
  article: IArticle;
  message: string;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ArticleData>>
): Promise<void> {
  try {
    await dbConnect();
  } catch (error: unknown) {
    throw createDatabaseError('Database connection failed', {}, error);
  }

  const { title, link, sourceName, publishedDate, descriptionSnippet, guid } = req.body;

  // Validate required fields
  if (!title || !link || !sourceName) {
    throw createValidationError('Missing required fields: title, link, and sourceName are required.');
  }

  try {
    // Check if article already exists
    let existingArticle: IArticle | null = null;
    if (guid) {
      existingArticle = await Article.findOne({ guid });
    }
    if (!existingArticle) {
      existingArticle = await Article.findOne({ link });
    }

    if (existingArticle) {
      throw new ConflictError('Article already exists');
    }

    // Create new article
    const newArticle = new Article({
      title,
      link,
      sourceName,
      publishedDate: publishedDate ? new Date(publishedDate) : undefined,
      descriptionSnippet,
      guid,
      fetchedAt: new Date(),
      isRead: false,
      isStarred: false,
      isHidden: false,
    });

    const savedArticle = await newArticle.save();
    
    res.status(201).json({
      success: true,
      data: {
        article: savedArticle,
        message: 'Article submitted successfully'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationError = error as unknown as { message: string; errors: Record<string, unknown> };
      throw createValidationError(validationError.message, validationError.errors);
    }
    
    throw createDatabaseError('Failed to submit article', {}, error);
  }
}

export default withHandler(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ArticleData>>
) => {
  if (req.method !== 'POST') {
    throw createValidationError('Method not allowed');
  }

  await handler(req, res);
});
