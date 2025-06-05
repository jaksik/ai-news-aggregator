import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/db';
import Article from '../../../../models/Article';
import { ErrorHandler } from '../../../../lib/errors/errorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await dbConnect();

    const { articleId } = req.query;
    const { newsCategory, techCategory, categoryRationale } = req.body;

    if (!articleId || typeof articleId !== 'string') {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    const updateData: Record<string, unknown> = {
      categorizationStatus: 'completed',
      categorizedAt: new Date(),
    };

    // Handle news category (including removal)
    if (newsCategory !== undefined) {
      updateData.newsCategory = newsCategory;
    }

    // Handle tech category (including removal)
    if (techCategory !== undefined) {
      updateData.techCategory = techCategory;
    }

    // Handle category rationale (including removal)
    if (categoryRationale !== undefined) {
      updateData.categoryRationale = categoryRationale;
    }

    // Validate that at least one field is being updated
    if (newsCategory === undefined && techCategory === undefined && categoryRationale === undefined) {
      return res.status(400).json({ error: 'At least one category field or rationale must be provided for update' });
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.status(200).json({
      success: true,
      data: updatedArticle,
    });
  } catch (error) {
    console.error('Error updating article categories:', error);
    await ErrorHandler.handleError(error, req, res);
  }
}
