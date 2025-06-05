import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/db';
import Article from '../../models/Article';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const articles = await Article.find({})
      .select('title descriptionSnippet newsCategory techCategory categoryRationale')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return res.status(200).json({
      success: true,
      count: articles.length,
      articles: articles.map(article => ({
        title: article.title,
        description: article.descriptionSnippet,
        newsCategory: article.newsCategory || null,
        techCategory: article.techCategory || null,
        categoryRationale: article.categoryRationale || null
      }))
    });

  } catch (error) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch articles' 
    });
  }
}