// File: pages/api/articles/external/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();
  } catch (error: unknown) {
    console.error('API /api/articles/external - DB Connection Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Database connection failed';
    return res.status(500).json({ error: 'Database connection failed', message: errorMessage });
  }

  try {
    const { title, link, sourceName, publishedDate, descriptionSnippet, guid } = req.body;

    // Validate required fields
    if (!title || !link || !sourceName) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, link, and sourceName are required.' 
      });
    }

    // Check if article already exists
    let existingArticle: IArticle | null = null;
    if (guid) {
      existingArticle = await Article.findOne({ guid });
    }
    if (!existingArticle) {
      existingArticle = await Article.findOne({ link });
    }

    if (existingArticle) {
      return res.status(409).json({ 
        error: 'Article already exists', 
        message: 'An article with this link or GUID already exists in the database.' 
      });
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
    return res.status(201).json({ 
      message: 'Article submitted successfully', 
      article: savedArticle 
    });

  } catch (error: unknown) {
    console.error('API /api/articles/external POST Error:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationError = error as unknown as { message: string; errors: Record<string, unknown> };
      return res.status(400).json({ 
        error: 'Validation failed', 
        message: validationError.message, 
        errors: validationError.errors 
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: 'Failed to submit article', message: errorMessage });
  }
}
